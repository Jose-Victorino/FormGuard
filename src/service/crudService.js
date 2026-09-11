import { createClient } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { createCRUDHooks } from './tanstackHooks'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY
const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/**
 * @typedef {import('@supabase/supabase-js').PostgrestQueryBuilder} PostgrestQueryBuilder
 */
/**
 * @typedef {{
 *  select?: string,
 *  filters?: Object,
 *  search?: {
 *    query: string,
 *    columns: string[],
 *  },
 *  order?: {
 *    column: string,
 *    ascending: boolean,
 *  },
 *  limit?: number | null,
 *  count?: string | null,
 *  page?: number | null,
 *  pageSize?: number,
 * }} GetAllParams
 * @typedef {{
 *  column?: string,
 *  id: string | number
 *  select?: string,
 *  filters?: Object,
 * }} GetByIdParams
 */
/**
 * @typedef {Object} CRUDBase
 * @property {(params?: GetAllParams) =>
 *   Promise<import('@supabase/supabase-js').PostgrestResponse<any>>
 * } getAll
 * @property {(params: GetByIdParams) =>
 *   Promise<import('@supabase/supabase-js').PostgrestSingleResponse<any>>
 * } getById
 * @property {(payload: Partial<any>) =>
 *   Promise<import('@supabase/supabase-js').PostgrestResponse<any>>
 * } putData
 * @property {(payload: Partial<any>, id: string | number) =>
 *   Promise<import('@supabase/supabase-js').PostgrestResponse<any>>
 * } updateData
 * @property {(params: { column: string, value: Array<string | number> }) =>
 *   Promise<import('@supabase/supabase-js').PostgrestSingleResponse<null>>
 * } deleteData
 * @property {(getData: () => void, extraTables: string[]) => void} subscribe
 */
/**
 * @template TExtend
 * @typedef {Object} Options
 * @property {string} [defaultSelect]
 * @property {(base: PostgrestQueryBuilder, crud: CRUDBase) => TExtend} [extend]
 */
/**
 * @template TExtend
 * @param {string} tableName
 * @param {Options<TExtend>} options
 * @returns {CRUDBase & TExtend}
 */
export const createCRUD = (
  tableName,
  {
    defaultSelect = '*',
    extend = (_base, _crud) => /** @type {TExtend} */ ({}),
  } = {}
) => {
  const base = supabase.from(tableName)

  /** @type {CRUDBase} */
  const crud = {
    getAll: async (params = {}) => {
      const { select = defaultSelect, filters = {}, search = { query: '', columns: [] }, order = { column: 'id', ascending: false }, limit = null, page = null, pageSize = null } = params
      
      let req = base
        .select(select, page ? { count: 'exact' } : undefined)
        .order(order.column, { ascending: order.ascending })

        req = req.match(filters)
  
      if(search.query && search.columns.length > 0){
        const orFilter = search.columns.map(col => `${col}.ilike.%${search.query}%`).join(',')
        req = req.or(orFilter)
      }

      if(page){
        const size = pageSize || 10
        const from = (page - 1) * size
        const to = from + size - 1
        req = req.range(from, to)
      }
      if(limit){
        req = req.limit(limit)
      }

      const result = await req

      if(result.error){
        console.error(`Error getting on ${tableName}:`, result.error.message)
        throw result.error
      }
      return result
    },
    getById: async ({column = 'id', id, select = defaultSelect, filters = {} }) => {
      const result = await base
        .select(select)
        .eq(column, id)
        .match(filters)
        .maybeSingle()

      if(result.error){
        console.error(`Error getting ${tableName}:`, result.error.message)
        throw result.error
      }
      return result
    },
    putData: async (payload) => {
      const result = await base
        .insert(payload)
        .select()

      if(result.error){
        console.error(`Error insert ${tableName}:`, result.error.message)
        throw result.error
      }
      return result
    },
    updateData: async (payload, id) => {
      const result = await base
        .update(payload)
        .eq('id', id)
        .select()

      if(result.error){
        console.error(`Error update ${tableName}:`, result.error.message)
        throw result.error
      }
      return result
    },
    deleteData: async ({ column = 'id', value }) => {
      const result = await base
        .delete()
        .in(column, value)

      if(result.error){
        console.error(`Error delete ${tableName}:`, result.error.message)
        throw result.error
      }
      return result
    },
    subscribe: (getData, extraTables = []) => {
      const tables = [tableName, ...extraTables]

      tables.forEach(table => {
        const existing = supabase
          .getChannels()
          .find(ch => ch.subTopic === `${table}-channel`)
        if(existing) supabase.removeChannel(existing)
      })

      const channels = tables.map(table =>
        supabase
          .channel(`${table}-channel`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table,
          }, () => getData())
          .subscribe()
      )

      return () => channels.forEach(ch => supabase.removeChannel(ch))
    },
  }
  return /** @type {CRUDBase & TExtend} */ (Object.assign(crud, extend(base, crud)))
}
/**
 * @typedef {Object} FileOptions
 * @property {string} [cacheControl]
 * @property {string} [contentType]
 * @property {string} [duplex]
 * @property {boolean} [upsert]
 */
/**
 * @param {string} bucketName
 */
export const bucket = (bucketName = SUPABASE_BUCKET) => {
  const storage = supabase.storage.from(bucketName)

  return ({
    /**
     * @param {string} fileName
     * @param {any} file
     * @param {FileOptions} options
     * @returns 
     */
    upload: async (fileName, file, options) => {
      const result = await storage.upload(fileName, file, options)

      if(result.error){
        console.error(`Error uploading ${fileName}:`, result.error.message)
        throw result.error
      }
      return result
    },
    /**
     * @param {string[]} fileName
     */
    remove: async (fileName = []) => {
      const result = await storage.remove([...fileName])

      if(result.error){
        console.error(`Error deleting ${fileName}:`, result.error.message)
        throw result.error
      }
      return result
    },
    getUrl: (fileName) => {
      const { data: { publicUrl } } = storage.getPublicUrl(fileName)

      return publicUrl
    },
    download: async (fileName) => {
      const result = await storage.download(fileName)

      if(result.error){
        console.error(`Error downloading ${fileName}:`, result.error.message)
        throw result.error
      }
      return result
    },
  })
}


export const techniqueService = createCRUD('technique')
export const techniqueHooks = createCRUDHooks(techniqueService, 'technique')

export const userService = createCRUD('user')
export const userHooks = createCRUDHooks(userService, 'user')

// Write-only from the client's perspective (rows are inserted by `Feedback`
// once `analyze()` resolves) — no hooks wrapper since nothing queries these
// directly yet; the session's own `defaultSelect` joins them in for reads.
export const issueService = createCRUD('issue')
export const strengthService = createCRUD('strength')

export const sessionService = createCRUD('session', {
  defaultSelect: '*, technique(id, name, variation), issue(id, reason), strength(id, reason)',
  extend: (base, crud) => ({
    getTrainingOverview: async () => {
      const result = await supabase
        .from('dashboard_training_overview')
        .select()
        .single()
      if(result.error) {
        console.error(result.error)
        throw result.error
      }
      return result
    },
    getRecentSessions: async (limit = 5) => (
      crud.getAll({
        select: 'id, created_at, overall_assessment, technique(id, name)',
        order: { column: 'created_at', ascending: false },
        limit,
      })
    ),
    getPerformance: async (period = '30d', technique_name) => {
      const result = await supabase.rpc('get_session_performance', {
        period,
        technique_name,
      })
      if(result.error){
        console.error(`Error getting performance:`, result.error.message)
        throw result.error
      }
      return result
    },
    getIssuesByTechnique: async (period = '30d') => {
      const result = await supabase.rpc('get_issue_counts', {
        period
      })
      if(result.error){
        console.error(`Error getting issues by technique:`, result.error.message)
        throw result.error
      }
      return result
    },
    getIssueHeatmap: async (technique) => {
      const result = await base
        .select('issue(category), technique(name)')
        .eq('technique.name', technique)

      if(result.error){
        console.error(result.error)
        throw result.error
      }

      return {
        ...result,
        data: result.data.flatMap(s => s.issue.map(i => i.category))
      }
    },
    getCommonIssues: async (limit_count = 3) => {
      const result = await supabase.rpc('get_common_issues', limit_count)
      if(result.error){
        console.error(`Error getting on performance:`, result.error.message)
        throw result.error
      }
      return result
    },
    getCommonStrengths: async (limit_count = 3) => {
      const result = await supabase.rpc('get_common_strengths', limit_count)
      if(result.error){
        console.error(`Error getting on performance:`, result.error.message)
        throw result.error
      }
      return result
    },
    getSessionComposition: async () => {
      const result = await supabase.rpc('get_session_composition')
      if(result.error){
        console.error(`Error getting session composition:`, result.error.message)
        throw result.error
      }
      return result
    },
  })
})
export const sessionHooks = createCRUDHooks(sessionService, 'session', () => {
  const useGetTrainingOverview = (userId) => (
    useQuery({
      queryKey: ['dashboard', 'training_overview', { userId }],
      queryFn: () => sessionService.getTrainingOverview(),
      enabled: !!userId,
    })
  )
  const useGetRecentSessions = (userId, { limit }) => (
    useQuery({
      queryKey: ['dashboard', 'recent_sessions', { userId, limit }],
      queryFn: () => sessionService.getRecentSessions(limit),
      enabled: !!userId,
    })
  )
  const useGetPerformance = (userId, {period, technique_name}) => (
    useQuery({
      queryKey: ['dashboard', 'performance', {userId, period, technique_name}],
      queryFn: () => sessionService.getPerformance(period, technique_name),
      enabled: !!userId,
    })
  )
  const useGetIssuesByTechnique = (userId, {period}) => (
    useQuery({
      queryKey: ['dashboard', 'issue_frequency', {userId, period}],
      queryFn: () => sessionService.getIssuesByTechnique(period),
      enabled: !!userId,
    })
  )
  const useGetIssueHeatmap = (userId, {technique}) => (
    useQuery({
      queryKey: ['dashboard', 'heatmap', {userId, technique}],
      queryFn: () => sessionService.getIssueHeatmap(technique),
      enabled: !!userId,
    })
  )
  const useGetCommonIssues = (userId, limit_count) => (
    useQuery({
      queryKey: ['dashboard', 'common_issues', { userId, limit_count }],
      queryFn: () => sessionService.getCommonIssues(limit_count),
      enabled: !!userId,
    })
  )
  const useGetCommonStrengths = (userId, limit_count) => (
    useQuery({
      queryKey: ['dashboard', 'common_strengths', { userId, limit_count }],
      queryFn: () => sessionService.getCommonStrengths(limit_count),
      enabled: !!userId,
    })
  )
  const useGetSessionComposition = (userId) => (
    useQuery({
      queryKey: ['dashboard', 'session_composition', { userId }],
      queryFn: () => sessionService.getSessionComposition(),
      enabled: !!userId,
    })
  )
  return {
    getTrainingOverview: useGetTrainingOverview,
    getRecentSessions: useGetRecentSessions,
    getPerformance: useGetPerformance,
    getIssuesByTechnique: useGetIssuesByTechnique,
    getIssueHeatmap: useGetIssueHeatmap,
    getCommonIssues: useGetCommonIssues,
    getCommonStrengths: useGetCommonStrengths,
    getSessionComposition: useGetSessionComposition,
  }
})