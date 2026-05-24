import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  useTheme,
} from '@mui/material';
import { useSyncLogs } from '../hooks/useSyncLogs';
import { useTasks } from '../hooks/useTasks';
import SyncLogTable from '../components/SyncLogTable';
import { SyncStatus, Task } from '../types';

/** Sync log page with tabs for recent and all logs */
const SyncLogPage: React.FC = () => {
  const theme = useTheme();
  const { logs, total, loading, query, updateQuery, changePage } = useSyncLogs();
  const { tasks } = useTasks();
  const [tabValue, setTabValue] = useState(0);
  const [filterTaskId, setFilterTaskId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const tab = newValue === 0 ? 'recent' : 'all';
    updateQuery({ tab, offset: 0 });
  };

  const handleFilterTaskChange = (taskId: string) => {
    setFilterTaskId(taskId);
    updateQuery({ taskId: taskId || undefined, offset: 0 });
  };

  const handleFilterStatusChange = (status: string) => {
    setFilterStatus(status);
    updateQuery({ status: (status || undefined) as SyncStatus | undefined, offset: 0 });
  };

  const currentPage = Math.floor((query.offset || 0) / (query.limit || 20));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.text.primary }}>
          同步日志
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
          查看仓库同步的历史记录和状态
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
            },
            '& .Mui-selected': {
              color: theme.palette.primary.main,
            },
            '& .MuiTabs-indicator': {
              background: `linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)`,
              height: 3,
              borderRadius: 2,
            },
          }}
        >
          <Tab label="最近 24 小时" />
          <Tab label="全量日志（7天）" />
        </Tabs>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>任务筛选</InputLabel>
          <Select
            value={filterTaskId}
            label="任务筛选"
            onChange={(e) => handleFilterTaskChange(e.target.value)}
          >
            <MenuItem value="">全部任务</MenuItem>
            {tasks.map((task: Task) => (
              <MenuItem key={task.id} value={task.id}>
                {task.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>状态筛选</InputLabel>
          <Select
            value={filterStatus}
            label="状态筛选"
            onChange={(e) => handleFilterStatusChange(e.target.value)}
          >
            <MenuItem value="">全部状态</MenuItem>
            <MenuItem value="success">成功</MenuItem>
            <MenuItem value="failed">失败</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="body2" sx={{ alignSelf: 'center', color: theme.palette.text.secondary, ml: 'auto' }}>
          共 {total} 条记录
        </Typography>
      </Box>

      {/* Log table */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            加载中...
          </Typography>
        </Box>
      ) : (
        <SyncLogTable
          logs={logs}
          total={total}
          page={currentPage}
          rowsPerPage={query.limit || 20}
          onPageChange={changePage}
        />
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SyncLogPage;
