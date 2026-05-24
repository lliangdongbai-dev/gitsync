import React from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material';

interface NotificationTestProps {
  testing: boolean;
  result: { success: boolean; message: string } | null;
  onTest: (channel: 'dingtalk' | 'feishu' | 'smtp') => void;
}

/** Notification test result display component */
const NotificationTest: React.FC<NotificationTestProps> = ({ testing, result, onTest }) => {
  const theme = useTheme();

  // This component is typically embedded in settings page
  // It's a simple helper for showing test results
  return (
    <Box>
      {testing && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            正在发送测试通知...
          </Typography>
        </Box>
      )}
      {result && !testing && (
        <Alert
          severity={result.success ? 'success' : 'error'}
          sx={{ mt: 1, borderRadius: 2 }}
        >
          {result.message}
        </Alert>
      )}
    </Box>
  );
};

export default NotificationTest;
