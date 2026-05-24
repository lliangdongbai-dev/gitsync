import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  useTheme,
  Divider,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Sync,
  Edit,
  Delete,
  ArrowForward,
  AccessTime,
  VpnKey,
  Https,
} from '@mui/icons-material';
import { Task, AuthType, BranchesConfig } from '../types';
import TaskStatusChip from './TaskStatusChip';

interface TaskCardProps {
  task: Task;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onTrigger: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Parse branches config and return a display summary */
function getBranchesSummary(task: Task): string {
  try {
    const config: BranchesConfig = JSON.parse(task.branches || '{"mode":"all"}');
    switch (config.mode) {
      case 'all':
        return '所有分支+标签';
      case 'all_branches':
        return '所有分支';
      case 'all_tags':
        return '所有标签';
      case 'custom': {
        const parts: string[] = [];
        if (config.branches && config.branches.length > 0) {
          parts.push(`${config.branches.length}个分支`);
        }
        if (config.tags && config.tags.length > 0) {
          parts.push(`${config.tags.length}个标签`);
        }
        return parts.length > 0 ? parts.join(' + ') : '未配置';
      }
      default:
        return task.branch || 'main';
    }
  } catch {
    return task.branch || 'main';
  }
}

/** Format duration in milliseconds to human-readable string */
function formatDuration(ms: number | null): string {
  if (ms === null || ms === 0) return '-';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}分${remainingSeconds}秒`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}时${remainingMinutes}分`;
}

/** Format frequency in minutes to human-readable string */
function formatFrequency(minutes: number): string {
  if (minutes >= 1440) {
    const days = minutes / 1440;
    return days === 1 ? '每天' : `每${days}天`;
  }
  if (minutes >= 60) {
    const hours = minutes / 60;
    return hours === 1 ? '每小时' : `每${hours}小时`;
  }
  return `每${minutes}分钟`;
}

/** Calculate next sync time based on last sync and frequency */
function getNextSyncTime(task: Task): string | null {
  if (task.status !== 'idle') return null;
  if (!task.lastSyncAt) return '即将同步';

  const lastSync = new Date(task.lastSyncAt).getTime();
  const nextSync = lastSync + task.syncFrequency * 60 * 1000;
  const now = Date.now();

  if (nextSync <= now) return '即将同步';

  const diff = nextSync - now;
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}时${mins}分后`;
  }
  if (minutes > 0) return `${minutes}分${seconds}秒后`;
  return `${seconds}秒后`;
}

/** Truncate a URL for display */
function truncateUrl(url: string, maxLen: number = 35): string {
  if (url.length <= maxLen) return url;
  return url.substring(0, maxLen - 3) + '...';
}

/** Task card component displaying task info and action buttons */
const TaskCard: React.FC<TaskCardProps> = ({ task, onStart, onStop, onTrigger, onDelete }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  const isActive = task.status === 'idle' || task.status === 'running';

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.12)',
          border: `1px solid ${theme.palette.primary.main}40`,
        },
      }}
    >
      <CardContent sx={{ flex: 1, pb: 1 }}>
        {/* Header: Name + Status */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1.05rem',
              color: theme.palette.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '60%',
            }}
          >
            {task.name}
          </Typography>
          <TaskStatusChip status={task.status} />
        </Box>

        {/* Source → Target */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {task.sourceAuthType === 'ssh_key' ? (
              <VpnKey sx={{ fontSize: 12, color: theme.palette.warning.main }} />
            ) : (
              <Https sx={{ fontSize: 12, color: theme.palette.text.secondary }} />
            )}
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {truncateUrl(task.sourceRepo)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 0.5 }}>
            <ArrowForward sx={{ fontSize: 16, color: theme.palette.primary.main }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {task.targetAuthType === 'ssh_key' ? (
              <VpnKey sx={{ fontSize: 12, color: theme.palette.warning.main }} />
            ) : (
              <Https sx={{ fontSize: 12, color: theme.palette.text.secondary }} />
            )}
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {truncateUrl(task.targetRepo)}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {/* Info row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              {formatFrequency(task.syncFrequency)}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)',
              px: 1,
              py: 0.2,
              borderRadius: 1,
              fontSize: '0.7rem',
            }}
          >
            🌿 {getBranchesSummary(task)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            {task.lastSyncAt
              ? `上次: ${new Date(task.lastSyncAt).toLocaleString('zh-CN')}`
              : '未同步'}
          </Typography>
          {(() => {
            const nextSync = getNextSyncTime(task);
            return nextSync ? (
              <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600, fontSize: '0.7rem' }}>
                ⏱ {nextSync}
              </Typography>
            ) : null;
          })()}
        </Box>

        {/* Error message */}
        {task.errorMessage && (
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.error.main,
              display: 'block',
              mt: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            错误: {task.errorMessage}
          </Typography>
        )}
      </CardContent>

      {/* Action buttons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          pb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {isActive ? (
            <Tooltip title="停止">
              <IconButton
                size="small"
                color="warning"
                onClick={() => onStop(task.id)}
                sx={{
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)',
                }}
              >
                <Stop fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="启动">
              <IconButton
                size="small"
                color="success"
                onClick={() => onStart(task.id)}
                sx={{
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)',
                }}
              >
                <PlayArrow fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="手动同步">
            <span>
              <IconButton
                size="small"
                color="primary"
                onClick={() => onTrigger(task.id)}
                disabled={task.status === 'running'}
                sx={{
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                }}
              >
                <Sync fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="编辑">
            <IconButton
              size="small"
              onClick={() => navigate(`/tasks/edit/${task.id}`)}
              sx={{ color: theme.palette.text.secondary }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="删除">
            <IconButton
              size="small"
              onClick={() => onDelete(task.id)}
              sx={{ color: theme.palette.error.main }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Card>
  );
};

export default TaskCard;
