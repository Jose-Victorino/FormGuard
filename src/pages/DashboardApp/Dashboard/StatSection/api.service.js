import { createCRUD, supabase } from "@/service/crudService"

export const dashboardService = createCRUD('session', {
  defaultSelect: 'id, technique(id, name, slug), video_url, duration_seconds, skill_level, overall_assessment, feedback, suggestions, frames, created_at',
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
      if(result.error) {
        console.error(result.error)
        throw result.error
      }
      return result
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
  })
})