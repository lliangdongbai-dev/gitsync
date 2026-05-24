import React from 'react';
import { Chip, useTheme } from '@mui/material';
import { CheckCircle, Error, Pause, Sync, HourglassEmpty } from '@mui/icons-material';
import { TaskStatus } from '../types';

interface TaskStatusChipProps {
  status: TaskStatus;
}

/** Status chip component showing task status with icon and color */
const TaskStatusChip: React.FC<TaskStatusChipProps> = ({ status }) => {
  const theme = useTheme();

  const statusConfig: Record<TaskStatus, { label: string; color: 'success' | 'error' | 'default' | 'warning' | 'info'; icon: React.ReactNode }> = {
    idle: {
      label: '空闲',
      color: 'success',
      icon: <CheckCircle sx={{ fontSize: 16 }} />,
    },
    running: {
      label: '同步中',
      color: 'info',
      icon: <Sync sx={{ fontSize: 16, animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />,
    },
    stopped: {
      label: '已停止',
      color: 'default',
      icon: <Pause sx={{ fontSize: 16 }} />,
    },
    error: {
      label: '错误',
      color: 'error',
      icon: <Error sx={{ fontSize: 16 }} />,
    },
  };

  const config = statusConfig[status];

  return (
    <Chip
      icon={config.icon as React.ReactElement}
      label={config.label}
      color={config.color}
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: '0.75rem',
        '& .MuiChip-icon': {
          ml: '4px',
        },
      }}
    />
  );
};

export default TaskStatusChip;
