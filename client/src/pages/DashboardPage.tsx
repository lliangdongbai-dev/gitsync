import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  useTheme,
  LinearProgress,
} from '@mui/material';
import {
  Assignment,
  PlayArrow,
  Error as ErrorIcon,
  CheckCircle,
  SyncAlt,
  Add,
  TrendingUp,
} from '@mui/icons-material';
import { useTasks } from '../hooks/useTasks';
import { useSyncLogs } from '../hooks/useSyncLogs';

/** Stat card component */
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}> = ({ title, value, icon, color, subtitle }) => {
  const theme = useTheme();
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 3,
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 4px 20px rgba(0,0,0,0.3)'
            : '0 4px 20px rgba(0,0,0,0.08)',
        },
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: 2.5,
          bgcolor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.text.primary, lineHeight: 1.2 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

/** Dashboard overview page */
const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { tasks } = useTasks();
  const { logs, total } = useSyncLogs();

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const runningTasks = tasks.filter(t => t.status === 'idle' || t.status === 'running').length;
    const errorTasks = tasks.filter(t => t.status === 'error').length;

    // Calculate success rate from recent logs
    const recentLogs = logs || [];
    const successLogs = recentLogs.filter(l => l.status === 'success').length;
    const successRate = recentLogs.length > 0
      ? Math.round((successLogs / recentLogs.length) * 100)
      : 100;

    return { totalTasks, runningTasks, errorTasks, successRate, totalLogs: total || 0 };
  }, [tasks, logs, total]);

  // Recent activity (last 5 logs)
  const recentActivity = useMemo(() => {
    return (logs || []).slice(0, 5);
  }, [logs]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.text.primary }}>
            仪表盘
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
            GitSync 同步状态概览
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/tasks/new')}
          sx={{
            background: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)',
            px: 3,
          }}
        >
          新建任务
        </Button>
      </Box>

      {/* Stats Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        <StatCard
          title="总任务数"
          value={stats.totalTasks}
          icon={<Assignment sx={{ fontSize: 26, color: '#6366F1' }} />}
          color="#6366F1"
        />
        <StatCard
          title="运行中"
          value={stats.runningTasks}
          icon={<PlayArrow sx={{ fontSize: 26, color: '#10B981' }} />}
          color="#10B981"
          subtitle={`${stats.totalTasks - stats.runningTasks} 个已停止`}
        />
        <StatCard
          title="异常任务"
          value={stats.errorTasks}
          icon={<ErrorIcon sx={{ fontSize: 26, color: '#EF4444' }} />}
          color="#EF4444"
        />
        <StatCard
          title="成功率"
          value={`${stats.successRate}%`}
          icon={<TrendingUp sx={{ fontSize: 26, color: '#06B6D4' }} />}
          color="#06B6D4"
          subtitle={`近24小时 ${stats.totalLogs} 次同步`}
        />
      </Box>

      {/* Recent Activity */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 3,
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            最近同步记录
          </Typography>
          <Button
            size="small"
            onClick={() => navigate('/logs')}
            sx={{ textTransform: 'none' }}
          >
            查看全部
          </Button>
        </Box>

        {recentActivity.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <SyncAlt sx={{ fontSize: 40, color: theme.palette.text.secondary, opacity: 0.3, mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              暂无同步记录
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {recentActivity.map((log) => (
              <Box
                key={log.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                }}
              >
                {log.status === 'success' ? (
                  <CheckCircle sx={{ fontSize: 20, color: '#10B981' }} />
                ) : (
                  <ErrorIcon sx={{ fontSize: 20, color: '#EF4444' }} />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {log.taskName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {log.triggerType === 'cron' ? '定时' : '手动'} · {new Date(log.startTime).toLocaleString('zh-CN')}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: log.status === 'success' ? '#10B981' : '#EF4444',
                    fontWeight: 600,
                  }}
                >
                  {log.status === 'success' ? '成功' : '失败'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {log.duration < 1000 ? `${log.duration}ms` : `${(log.duration / 1000).toFixed(1)}s`}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Success rate bar */}
      {stats.totalLogs > 0 && (
        <Paper
          sx={{
            p: 3,
            mt: 2.5,
            borderRadius: 3,
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
            同步成功率
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate"
                value={stats.successRate}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 5,
                    background: stats.successRate >= 90
                      ? 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)'
                      : stats.successRate >= 70
                        ? 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)'
                        : '#EF4444',
                  },
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 45 }}>
              {stats.successRate}%
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default DashboardPage;
