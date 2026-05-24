import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar,
  useTheme,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { useTasks } from '../hooks/useTasks';
import TaskCard from '../components/TaskCard';

/** Task list page showing all tasks as cards in a grid layout */
const TaskListPage: React.FC = () => {
  const { tasks, loading, error, startTaskSync, stopTaskSync, manualSync, removeTask, fetchTasks } = useTasks();
  const navigate = useNavigate();
  const theme = useTheme();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleStart = async (id: string) => {
    const success = await startTaskSync(id);
    setSnackbar({
      open: true,
      message: success ? '任务已启动' : '启动失败',
      severity: success ? 'success' : 'error',
    });
  };

  const handleStop = async (id: string) => {
    const success = await stopTaskSync(id);
    setSnackbar({
      open: true,
      message: success ? '任务已停止' : '停止失败',
      severity: success ? 'success' : 'error',
    });
  };

  const handleTrigger = async (id: string) => {
    const result = await manualSync(id);
    setSnackbar({
      open: true,
      message: result.message,
      severity: result.success ? 'success' : 'error',
    });
  };

  const handleDeleteClick = (id: string) => {
    setTaskToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (taskToDelete) {
      const success = await removeTask(taskToDelete);
      setSnackbar({
        open: true,
        message: success ? '任务已删除' : '删除失败',
        severity: success ? 'success' : 'error',
      });
    }
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.text.primary }}>
            任务列表
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
            管理您的 Git 仓库同步任务
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

      {/* Error alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Task grid */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            加载中...
          </Typography>
        </Box>
      ) : tasks.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 10,
            borderRadius: 4,
            border: `2px dashed ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(99,102,241,0.02)',
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            暂无同步任务
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            点击上方「新建任务」按钮创建您的第一个同步任务
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => navigate('/tasks/new')}
          >
            新建任务
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
            },
            gap: 2.5,
          }}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStart={handleStart}
              onStop={handleStop}
              onTrigger={handleTrigger}
              onDelete={handleDeleteClick}
            />
          ))}
        </Box>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: 3, p: 1 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要删除此同步任务吗？此操作不可撤销，相关的同步日志也将被删除。
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>

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

export default TaskListPage;
