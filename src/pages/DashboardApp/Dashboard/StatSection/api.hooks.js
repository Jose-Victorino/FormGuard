import { createCRUDHooks } from "@/service/tanstackHooks"
import { useQuery } from "@tanstack/react-query"
import { dashboardService } from "./api.service"

export const dashboardHooks = createCRUDHooks(dashboardService, 'session', () => ({
  getTrainingOverview: (userId) => (
    useQuery({
      queryKey: ['dashboard', 'training_overview', { userId }],
      queryFn: () => dashboardService.getTrainingOverview(),
      enabled: !!userId,
    })
  ),
  getRecentSessions: (userId, { limit }) => (
    useQuery({
      queryKey: ['dashboard', 'recent_sessions', { userId, limit }],
      queryFn: () => dashboardService.getRecentSessions(limit),
      enabled: !!userId,
    })
  ),
  getPerformance: (userId, {period, technique_name}) => (
    useQuery({
      queryKey: ['dashboard', 'performance', {userId, period, technique_name}],
      queryFn: () => dashboardService.getPerformance(period, technique_name),
      enabled: !!userId,
    })
  ),
  getIssuesByTechnique: (userId, {period}) => (
    useQuery({
      queryKey: ['dashboard', 'issue_frequency', {userId, period}],
      queryFn: () => dashboardService.getIssuesByTechnique(period),
      enabled: !!userId,
    })
  ),
  getIssueHeatmap: (userId, {technique}) => (
    useQuery({
      queryKey: ['dashboard', 'heatmap', {userId, technique}],
      queryFn: () => dashboardService.getIssueHeatmap(technique),
      enabled: !!userId,
    })
  ),
  getCommonIssues: (userId, limit_count) => (
    useQuery({
      queryKey: ['dashboard', 'common_issues', { userId, limit_count }],
      queryFn: () => dashboardService.getCommonIssues(limit_count),
      enabled: !!userId,
    })
  ),
  getCommonStrengths: (userId, limit_count) => (
    useQuery({
      queryKey: ['dashboard', 'common_strengths', { userId, limit_count }],
      queryFn: () => dashboardService.getCommonStrengths(limit_count),
      enabled: !!userId,
    })
  ),
}))