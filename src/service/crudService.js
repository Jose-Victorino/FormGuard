import { createClient } from '@supabase/supabase-js'
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
 * }} GetAllOptions
 * @typedef {{
 *  select?: string,
 *  filters?: Object,
 * }} GetByIdOptions
 */
/**
 * @typedef {Object} CRUDBase
 * @property {(options?: GetAllOptions) =>
 *   Promise<import('@supabase/supabase-js').PostgrestResponse<any>>
 * } getAll
 * @property {(params: {
 *   column?: string,
 *   id: string | number
 * }, options?: GetByIdOptions) =>
 *   Promise<import('@supabase/supabase-js').PostgrestSingleResponse<any>>
 * } getById
 * @property {(payload: Partial<any>) =>
 *   Promise<import('@supabase/supabase-js').PostgrestResponse<any>>
 * } putData
 * @property {(payload: Partial<any>, id: string | number) =>
 *   Promise<import('@supabase/supabase-js').PostgrestResponse<any>>
 * } updateData
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

  const crud = {
    getAll: async (opts = {}) => {
      const { select = defaultSelect, filters = {}, search = { query: '', columns: [] }, order = { column: 'id', ascending: false }, limit = null, page = null, pageSize = null } = opts
      
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
    getById: async ({column = 'id', id}, { select = defaultSelect, filters = {} } = {}) => {
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
        .eq(column, value)

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

export const bucket = (bucketName = SUPABASE_BUCKET) => {
  const storage = supabase.storage.from(bucketName)

  return ({
    upload: async (fileName, file, options) => {
      const result = await storage.upload(fileName, file, options)

      if(result.error){
        console.error(`Error uploading ${fileName}:`, result.error.message)
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

export const sessionService = createCRUD('session', {
  defaultSelect: 'id, user_id, technique_id, technique(id, name, slug), video_url, thumbnail_url, duration_seconds, skill_level, overall_assessment, feedback, suggestions, frames, created_at',
})
export const sessionHooks = createCRUDHooks(sessionService, 'session')