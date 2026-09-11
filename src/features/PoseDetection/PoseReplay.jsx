import { useState, useRef, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useSessionContext } from './SessionLayout'
import { bucket, sessionHooks } from '@/service/crudService'

import Button from '@/components/Button/Button'
import { processRecording } from './util/poseProcessing'

import s from './PoseReplay.module.scss'
import { analyze } from './util/llmFeedback'

function PoseReplay({ userId, techniqueData }) {
  const navigate = useNavigate()
  const { recording, setRecording } = useSessionContext()
  const [submitError, setSubmitError] = useState(null)
  const [res, setRes] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const videoRef = useRef(null)

  const { mutateAsync: createSession } = sessionHooks.putData(false)

  const handleTimeUpdate = () => {
    setCurrentTime(videoRef.current?.currentTime ?? 0)
  }
  const handleLoadedMetadata = () => {
    setDuration(videoRef.current?.duration ?? 0)
  }

  const jumpVideoTime = (seconds) => {
    const video = videoRef.current
    video.currentTime = seconds
  }

  // Full recorded range, in landmark-clock seconds (same `t` used to filter
  // frames below).
  const fullStart = 0
  const fullEnd = recording?.landmarks.at(-1)?.t ?? 0

  // Manual trim: the user marks where the real technique execution starts
  // and ends, so pre-swing waggle / post-swing idle motion never reaches
  // phaseDetection. `null` means "not marked" — falls back to the full clip.
  // Deliberately not automatic — see chat/vault notes on why energy-based
  // active-window detection was rolled back (it broke on smash forehand's
  // long duty cycle).
  const [trimStart, setTrimStart] = useState(null)
  const [trimEnd, setTrimEnd] = useState(null)
  const effectiveStart = trimStart ?? fullStart
  const effectiveEnd = trimEnd ?? fullEnd

  const markTrimStart = () => {
    const t = videoRef.current?.currentTime ?? 0
    setTrimStart(Math.min(t, effectiveEnd))
  }
  const markTrimEnd = () => {
    const t = videoRef.current?.currentTime ?? 0
    setTrimEnd(Math.max(t, effectiveStart))
  }
  const clearTrimStart = () => setTrimStart(null)
  const clearTrimEnd = () => setTrimEnd(null)

  const trimmedLandmarks = useMemo(
    () => recording?.landmarks.filter((f) => f.t >= effectiveStart && f.t <= effectiveEnd) ?? [],
    [recording, effectiveStart, effectiveEnd]
  )
  // Both marks must be explicitly set — falling back to the full clip
  // range silently (the old behavior) let a user hit Continue without
  // marking anything at all.
  const bothMarksSet = trimStart !== null && trimEnd !== null
  const hasValidTrim = bothMarksSet && effectiveEnd > effectiveStart && trimmedLandmarks.length >= 2

  // Native video controls typically inset the scrubber track from the
  // edges of the control bar (Chrome/Chromium: ~16px on each side for
  // padding around the track itself, separate from the play/volume/
  // fullscreen buttons which sit outside the video's own width). Mapping
  // straight 0-100% against the full video width overshoots that inset, so
  // markers land further out than the actual timestamp on the track.
  // Still an approximation — browsers don't expose the real value — but
  // this lines up much closer than a plain percentage.
  const trackInset = 16
  const markerLeft = (t) => {
    const ratio = duration > 0 ? Math.min(1, Math.max(0, t / duration)) : 0
    return `calc(${trackInset}px + (100% - ${trackInset * 2}px) * ${ratio})`
  }
  const formatTime = (t) => `${(t ?? 0).toFixed(2)}s`

  const confirmRecording = async () => {
    // Checked first, before anything else runs (including whether a
    // recording blob exists) — an unmarked/invalid trim should never let
    // submission proceed.
    if(!hasValidTrim){
      setSubmitError('Mark both a start and end point around the technique execution before continuing.')
      return
    }

    if(!recording?.blob) return

    setIsSubmitting(true)
    setSubmitError(null)

    try{
      const now = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Manila",
        month: "numeric",
        day: "numeric",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).replace(/[/:,\s]+/g, "-")

      const contentType = recording.blob.type || 'video/webm'
      const extension = contentType.split('/')[1]?.split(';')[0] || 'webm'
      const videoFileName = `${userId}_${now}.${extension}`

      await bucket().upload(videoFileName, recording.blob, { contentType })
      const videoUrl = bucket().getUrl(videoFileName)

      const { data: [inserted] } = await createSession({
        user_id: userId,
        technique_id: techniqueData.id,
        video_url: videoUrl,
        video_path: videoFileName,
        duration_seconds: Math.round(recording.landmarks.at(-1)?.t ?? 0),
        frames: recording.landmarks,
      })

      navigate(`/app/feedback/${inserted.id}`)
    } catch(err){
      console.error('Could not save recording:', err)
      setSubmitError('Could not save this recording. Please try again.')
    }
  }

  const getStats = async () => {
    try{
      const result = await processRecording({
        videoUrl: recording.videoUrl,
        landmarks: trimmedLandmarks,
        technique: techniqueData.name.toLowerCase(),
        variation: techniqueData.variation.toLowerCase(),
        racketSide: 'right',
        debug: true
      })
      console.log(result)
      setRes(result)
    } catch(err){}
  }

  return (
    <>
      <div className='flex j-center' style={{ width: 'min(100%, 1200px)', marginInline: 'auto' }}>
        <div className={s.videoWrap}>
          <video
            ref={videoRef}
            src={recording?.videoUrl}
            style={{ maxWidth: '100%', maxHeight: '80vh', width: 'auto', height: 'auto', display: 'block' }}
            controls
            crossOrigin="anonymous"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
          />
          <div className={s.markerOverlay}>
            <div
              className={s.rangeHighlight}
              style={{
                left: markerLeft(trimStart ?? 0),
                width: `calc(${markerLeft(trimEnd ?? duration)} - ${markerLeft(trimStart ?? 0)})`,
              }}
            />
            {trimStart !== null &&
              <div
                className={s.marker}
                style={{ left: markerLeft(trimStart) }}
                onClick={() => jumpVideoTime(trimStart)}
                role='button'
                tabIndex={0}
                aria-label={`Seek to start mark, ${formatTime(trimStart)}`}
              >
                <span>Start {formatTime(trimStart)}</span>
                <button
                  type='button'
                  className={s.markerClose}
                  onClick={(e) => { e.stopPropagation(); clearTrimStart() }}
                  aria-label='Remove start mark'
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </div>
            }
            {trimEnd !== null &&
              <div
                className={s.marker}
                style={{ left: markerLeft(trimEnd) }}
                onClick={() => jumpVideoTime(trimEnd)}
                role='button'
                tabIndex={0}
                aria-label={`Seek to end mark, ${formatTime(trimEnd)}`}
              >
                <span>End {formatTime(trimEnd)}</span>
                <button
                  type='button'
                  className={s.markerClose}
                  onClick={(e) => { e.stopPropagation(); clearTrimEnd() }}
                  aria-label='Remove end mark'
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </div>
            }
          </div>
        </div>
      </div>
      <div className='flex gap-15'>
        <Button
          btnType='secondary'
          text={trimStart !== null ? `✓ Start marked (${formatTime(trimStart)})` : `Mark start (${formatTime(currentTime)})`}
          onClick={markTrimStart}
          disabled={isSubmitting}
        />
        <Button
          btnType='secondary'
          text={trimEnd !== null ? `✓ End marked (${formatTime(trimEnd)})` : `Mark end (${formatTime(currentTime)})`}
          onClick={markTrimEnd}
          disabled={isSubmitting}
        />
      </div>
      {hasValidTrim &&
        <span className={s.selectionValid}>Selected: {formatTime(effectiveEnd - effectiveStart)}</span>
      }
      {!hasValidTrim &&
        <span className={s.selectionInvalid}>
          {bothMarksSet
            ? 'Selected range is too short to analyze — adjust start/end.'
            : 'Mark a start and end point around the technique execution.'}
        </span>
      }
      <div className='flex gap-15'>
        <Button
          btnType='secondary'
          text='Record again'
          onClick={() => setRecording(null)}
          span
          disabled={isSubmitting}
          />
        <Button
          text={isSubmitting ? 'Uploading...' : 'Continue'}
          onClick={() => confirmRecording()}
          span
          disabled={isSubmitting || !hasValidTrim}
        />
        {/* <Button
          text='Get Stats'
          onClick={() => getStats()}
          disabled={!hasValidTrim}
        /> */}
      </div>
      {/* <ul className='flex-wrap gap-10'>
        {res?.phases.map(({t, label}) =>
          <li key={label}>
            <Button
              text={`${label.replaceAll('_', ' ')}: ${t.toFixed(2)}s`}
              onClick={() => jumpVideoTime(t)}
            />
          </li>
        )}
      </ul> */}
      {submitError && <span>{submitError}</span>}
    </>
  )
}

export default PoseReplay