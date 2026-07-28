import s from './About.module.scss'

function About() {
  return (
    <>
      <section className={s.how}>
        <div className='container flex-col gap-20 pad-block-80'>
          <h3>About FormGuard</h3>
          <p>FormGuard is a web-based training system designed to help badminton players improve their technique execution using AI motion-guided feedback. The system captures your movement through video, extracts your body pose, and compares it with expert reference motions to provide clear, actionable corrections.</p>
          <p>This project was developed as part of an undergraduate thesis titled “FormGuard: A Web-Based AI-Powered E-Coaching System for Badminton Using Video-Based Pose Estimation.” Its goal is to provide a means of learning badminton through technology.</p>
        </div>
      </section>
      <section>
        <div className='container res-flex-row gap-20 pad-block-80'>
          <div className='flex-col gap-5'>
            <h3>Why It Matters</h3>
            <p>Proper technique is critical in badminton to prevent injury and maximize performance. FormGuard allows players to identify errors in their movements, understand how to correct them, and track improvement over time.</p>
          </div>
          <div className='flex-col gap-5'>
            <h3>Academic Context</h3>
            <p>This system demonstrates the practical application of computer vision and pose estimation in sports training, contributing to research in motion analysis and skill correction.</p>
          </div>
        </div>
      </section>
    </>
  )
}

export default About