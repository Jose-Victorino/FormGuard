import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, usePrefetchQuery } from '@tanstack/react-query'

/**
 * @typedef {ReturnType<typeof useQuery>} QueryHook
 * @typedef {ReturnType<typeof usePrefetchQuery>} PrefetchHook
 * @typedef {ReturnType<typeof useMutation>} MutationHook
 */
/**
 * @typedef {Object} UpdateDataVariables
 * @property {Object} [payload]
 * @property {String | Number} id
 */
/**
 * @typedef {Object} HookBase
 * @property {(params?: Object, options?: Object) => QueryHook} getAll
 * @property {(params?: Object, options?: Object) => PrefetchHook} prefetchAll
 * @property {(id: Object, options?: Object) => QueryHook} getById
 * @property {(id: Object, options?: Object) => PrefetchHook} prefetchById
 * @property {(isOptimistic?: boolean, options?: Object) => MutationHook} putData
 * @property {(options?: Object) => MutationHook} updateData
 * @property {(options?: Object) => MutationHook} deleteData
 * @property {(extraTables?: string[]) => void} subscribe
 */
/**
 * @template TExtend
 * @param {any} service
 * @param {string} tableName
 * @param {() => TExtend} extend
 * @returns {HookBase & TExtend}
 */
export const createCRUDHooks = (service, tableName, extend = () => /** @type {TExtend} */ ({})) => {
  const keys = {
    lists:  (params) => [tableName, 'list', params],
    record: (id)     => [tableName, 'record', id],
  }

  const hooks = {
    getAll: (params = {}, options = {}) => (
      useQuery({
        queryKey: keys.lists(params),
        queryFn: () => service.getAll(params),
        ...options,
      })
    ),
    prefetchAll: (params = {}, options = {}) => (
      usePrefetchQuery({
        queryKey: keys.lists(params),
        queryFn: () => service.getAll(params),
        ...options,
      })
    ),
    getById: (id, options = {}) => (
      useQuery({
        queryKey: keys.record(id),
        queryFn: () => service.getById(id),
        enabled: !!id?.id,
        ...options,
      })
    ),
    prefetchById: (id, options = {}) => {
      const queryClient = useQueryClient()

      useEffect(() => {
        if(!id?.id) return

        queryClient.prefetchQuery({
          queryKey: keys.record(id),
          queryFn: () => service.getById(id),
          ...options,
        })
      }, [id, queryClient])
    },
    putData: (isOptimistic = true, options = {}) => {
      const queryClient = useQueryClient()
      return useMutation({
        /** @param {any} payload */
        mutationFn: (payload) => service.putData(payload),
        ...(isOptimistic ? {
          onMutate: async (payload) => {
            await queryClient.cancelQueries({ queryKey: [tableName] })
            const previous = queryClient.getQueriesData({ queryKey: [tableName] })
  
            queryClient.setQueriesData({ queryKey: [tableName] }, (old) => {
              if(!old?.data) return old
              return { ...old, data: [{ ...payload, id: crypto.randomUUID() }, ...old.data] }
            })
  
            return { previous }
          },
          onError: (_err, _, context) => {
            context.previous.forEach(([key, value]) => queryClient.setQueryData(key, value))
          }
        } : {}),
        onSettled: () => queryClient.invalidateQueries({ queryKey: [tableName] }),
        ...options,
      })
    },
    updateData: (options = {}) => {
      const queryClient = useQueryClient()
      return useMutation({
        /** @param {UpdateDataVariables} data */
        mutationFn: ({ payload, id }) => service.updateData(payload, id),
        onMutate: async ({ payload, id }) => {
          await queryClient.cancelQueries({ queryKey: [tableName] })
          const previous = queryClient.getQueriesData({ queryKey: [tableName] })
  
          queryClient.setQueriesData({ queryKey: [tableName] }, (old) => {
            if (!old?.data) return old
            if (Array.isArray(old.data)) {
              return {
                ...old,
                data: old.data.map(item => item.id === id ? { ...item, ...payload } : item),
              }
            }
            if (old.data.id === id) {
              return { ...old, data: { ...old.data, ...payload } }
            }
            return old
          })
  
          return { previous }
        },
        onError: (err, _, context) => {
          context?.previous?.forEach(([key, value]) => queryClient.setQueryData(key, value))
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: [tableName] }),
        ...options,
      })
    },
    deleteData: (options = {}) => {
      const queryClient = useQueryClient()
      return useMutation({
        /**
         * @param {{
         * column: string,
         * value: string | Number,
         * }} id
         * */
        mutationFn: ({ column, value }) => service.deleteData({ column, value }),
        onMutate: async ({ column = 'id', value }) => {
          await queryClient.cancelQueries({ queryKey: [tableName] })
          const previous = queryClient.getQueriesData({ queryKey: [tableName] })
  
          queryClient.setQueriesData({ queryKey: [tableName] }, (old) => {
            if (!old?.data) return old
            return { ...old, data: old.data.filter(item => item[column] !== value) }
          })
  
          return { previous }
        },
        onError: (err, _, context) => {
          context.previous.forEach(([key, value]) => queryClient.setQueryData(key, value))
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: [tableName] }),
        ...options,
      })
    },
    subscribe: (extraTables = []) => {
      const queryClient = useQueryClient()
      useEffect(() => {
        const unsubscribe = service.subscribe(() =>
          queryClient.invalidateQueries({ queryKey: [tableName] }),
          extraTables
        )
        return unsubscribe
      }, [queryClient, extraTables])
    },
  }

  return Object.assign(hooks, extend())
}