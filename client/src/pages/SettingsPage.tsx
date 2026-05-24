import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  InputAdornment,
  useTheme,
} from '@mui/material';
import {
  ExpandMore,
  Send as SendIcon,
  Chat as DingtalkIcon,
  Message as FeishuIcon,
  Email as EmailIcon,
  Lock,
} from '@mui/icons-material';
import { useSettings } from '../hooks/useSettings';
import NotificationTest from '../components/NotificationTest';
import { NotificationChannel } from '../types';

/** Settings page with notification and auth configuration */
const SettingsPage: React.FC = () => {
  const theme = useTheme();
  const { settings, loading, updateSetting, testNotif, testing } = useSettings();

  // DingTalk settings
  const [dingtalkEnabled, setDingtalkEnabled] = useState(false);
  const [dingtalkWebhook, setDingtalkWebhook] = useState('');
  const [dingtalkSecret, setDingtalkSecret] = useState('');

  // Feishu settings
  const [feishuEnabled, setFeishuEnabled] = useState(false);
  const [feishuWebhook, setFeishuWebhook] = useState('');
  const [feishuSecret, setFeishuSecret] = useState('');

  // SMTP settings
  const [smtpEnabled, setSmtpEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpTo, setSmtpTo] = useState('');

  // Auth settings
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');

  // Notification policy
  const [notifyOnSuccess, setNotifyOnSuccess] = useState(false);

  // Test results
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});

  // Save status
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Initialize settings from API
  useEffect(() => {
    if (settings) {
      setDingtalkEnabled(settings.dingtalk_enabled === true || settings.dingtalk_enabled === 'true');
      setDingtalkWebhook(settings.dingtalk_webhook || '');
      setDingtalkSecret(settings.dingtalk_secret || '');

      setFeishuEnabled(settings.feishu_enabled === true || settings.feishu_enabled === 'true');
      setFeishuWebhook(settings.feishu_webhook || '');
      setFeishuSecret(settings.feishu_secret || '');

      setSmtpEnabled(settings.smtp_enabled === true || settings.smtp_enabled === 'true');
      setSmtpHost(settings.smtp_host || '');
      setSmtpPort(String(settings.smtp_port || '465'));
      setSmtpSecure(settings.smtp_secure !== false && settings.smtp_secure !== 'false');
      setSmtpUser(settings.smtp_user || '');
      setSmtpPass(settings.smtp_pass || '');
      setSmtpFrom(settings.smtp_from || '');
      setSmtpTo(settings.smtp_to || '');

      setAuthUser(settings.auth_user || '');
      setAuthPass(settings.auth_pass || '');

      setNotifyOnSuccess(settings.notify_on_success === true || settings.notify_on_success === 'true');
    }
  }, [settings]);

  /** Save DingTalk settings */
  const saveDingtalk = async () => {
    await updateSetting('dingtalk_enabled', dingtalkEnabled);
    await updateSetting('dingtalk_webhook', dingtalkWebhook);
    await updateSetting('dingtalk_secret', dingtalkSecret);
    setSaveStatus({ success: true, message: '钉钉通知设置已保存' });
  };

  /** Save Feishu settings */
  const saveFeishu = async () => {
    await updateSetting('feishu_enabled', feishuEnabled);
    await updateSetting('feishu_webhook', feishuWebhook);
    await updateSetting('feishu_secret', feishuSecret);
    setSaveStatus({ success: true, message: '飞书通知设置已保存' });
  };

  /** Save SMTP settings */
  const saveSmtp = async () => {
    await updateSetting('smtp_enabled', smtpEnabled);
    await updateSetting('smtp_host', smtpHost);
    await updateSetting('smtp_port', smtpPort);
    await updateSetting('smtp_secure', smtpSecure);
    await updateSetting('smtp_user', smtpUser);
    await updateSetting('smtp_pass', smtpPass);
    await updateSetting('smtp_from', smtpFrom);
    await updateSetting('smtp_to', smtpTo);
    setSaveStatus({ success: true, message: '邮箱通知设置已保存' });
  };

  /** Save auth settings */
  const saveAuth = async () => {
    await updateSetting('auth_user', authUser);
    await updateSetting('auth_pass', authPass);
    // Also update localStorage for client-side auth
    if (authUser && authPass) {
      localStorage.setItem('gitsync_auth_user', authUser);
      localStorage.setItem('gitsync_auth_pass', authPass);
    } else {
      localStorage.removeItem('gitsync_auth_user');
      localStorage.removeItem('gitsync_auth_pass');
    }
    setSaveStatus({ success: true, message: '认证设置已保存' });
  };

  /** Test a notification channel */
  const handleTestNotification = async (channel: NotificationChannel) => {
    const result = await testNotif(channel);
    setTestResults(prev => ({ ...prev, [channel]: result }));
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="text.secondary">加载设置中...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.text.primary }}>
          系统设置
        </Typography>
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 0.5 }}>
          配置通知方式和访问认证
        </Typography>
      </Box>

      {/* Save status alert */}
      {saveStatus && (
        <Alert
          severity={saveStatus.success ? 'success' : 'error'}
          onClose={() => setSaveStatus(null)}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          {saveStatus.message}
        </Alert>
      )}

      <Box sx={{ maxWidth: 720 }}>
        {/* Notification Policy */}
        <Paper
          sx={{
            p: 3,
            mb: 2,
            borderRadius: 3,
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
              🔔 通知策略
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            默认仅在同步失败时发送通知。开启下方选项后，同步成功也会发送通知。
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={notifyOnSuccess}
                onChange={async (e) => {
                  const val = e.target.checked;
                  setNotifyOnSuccess(val);
                  await updateSetting('notify_on_success', val);
                  setSaveStatus({ success: true, message: val ? '已开启成功通知' : '已关闭成功通知（仅失败时通知）' });
                }}
                color="primary"
              />
            }
            label="同步成功时也发送通知"
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 4.5 }}>
            {notifyOnSuccess ? '当前：成功和失败都会通知' : '当前：仅同步失败时通知'}
          </Typography>
        </Paper>

        {/* DingTalk Settings */}
        <Accordion
          defaultExpanded
          sx={{
            mb: 2,
            borderRadius: '16px !important',
            '&:before': { display: 'none' },
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <DingtalkIcon sx={{ color: '#0089FF' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                钉钉通知
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                通过钉钉机器人推送同步失败告警
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={dingtalkEnabled}
                  onChange={(e) => setDingtalkEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label="启用钉钉通知"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Webhook URL"
              value={dingtalkWebhook}
              onChange={(e) => setDingtalkWebhook(e.target.value)}
              placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx"
              sx={{ mb: 2 }}
              disabled={!dingtalkEnabled}
            />
            <TextField
              fullWidth
              label="签名密钥 (Secret)"
              value={dingtalkSecret}
              onChange={(e) => setDingtalkSecret(e.target.value)}
              placeholder="SEC..."
              type="password"
              sx={{ mb: 2 }}
              disabled={!dingtalkEnabled}
              helperText="可选，用于安全验证"
            />
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button
                variant="contained"
                size="small"
                onClick={saveDingtalk}
                sx={{ background: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)' }}
              >
                保存
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SendIcon />}
                onClick={() => handleTestNotification('dingtalk')}
                disabled={!dingtalkEnabled || !dingtalkWebhook}
              >
                测试发送
              </Button>
            </Box>
            <NotificationTest
              testing={testing}
              result={testResults['dingtalk'] || null}
              onTest={() => handleTestNotification('dingtalk')}
            />
          </AccordionDetails>
        </Accordion>

        {/* Feishu Settings */}
        <Accordion
          sx={{
            mb: 2,
            borderRadius: '16px !important',
            '&:before': { display: 'none' },
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FeishuIcon sx={{ color: '#3370FF' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                飞书通知
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                通过飞书机器人推送同步失败告警
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={feishuEnabled}
                  onChange={(e) => setFeishuEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label="启用飞书通知"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Webhook URL"
              value={feishuWebhook}
              onChange={(e) => setFeishuWebhook(e.target.value)}
              placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
              sx={{ mb: 2 }}
              disabled={!feishuEnabled}
            />
            <TextField
              fullWidth
              label="签名密钥 (Secret)"
              value={feishuSecret}
              onChange={(e) => setFeishuSecret(e.target.value)}
              placeholder="签名密钥..."
              type="password"
              sx={{ mb: 2 }}
              disabled={!feishuEnabled}
              helperText="可选，用于安全验证"
            />
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button
                variant="contained"
                size="small"
                onClick={saveFeishu}
                sx={{ background: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)' }}
              >
                保存
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SendIcon />}
                onClick={() => handleTestNotification('feishu')}
                disabled={!feishuEnabled || !feishuWebhook}
              >
                测试发送
              </Button>
            </Box>
            <NotificationTest
              testing={testing}
              result={testResults['feishu'] || null}
              onTest={() => handleTestNotification('feishu')}
            />
          </AccordionDetails>
        </Accordion>

        {/* SMTP Settings */}
        <Accordion
          sx={{
            mb: 2,
            borderRadius: '16px !important',
            '&:before': { display: 'none' },
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <EmailIcon sx={{ color: '#EA4335' }} />
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                邮箱通知
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                通过邮件推送同步失败告警
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={smtpEnabled}
                  onChange={(e) => setSmtpEnabled(e.target.checked)}
                  color="primary"
                />
              }
              label="启用邮箱通知"
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2, mb: 2 }}>
              <TextField
                label="SMTP 服务器"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.example.com"
                disabled={!smtpEnabled}
              />
              <TextField
                label="端口"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="465"
                disabled={!smtpEnabled}
              />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label="使用 SSL/TLS"
              sx={{ mb: 2 }}
              disabled={!smtpEnabled}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <TextField
                label="用户名"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="user@example.com"
                disabled={!smtpEnabled}
              />
              <TextField
                label="密码"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                type="password"
                disabled={!smtpEnabled}
              />
            </Box>
            <TextField
              fullWidth
              label="发件人地址"
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
              placeholder="gitsync@example.com"
              sx={{ mb: 2 }}
              disabled={!smtpEnabled}
            />
            <TextField
              fullWidth
              label="收件人地址"
              value={smtpTo}
              onChange={(e) => setSmtpTo(e.target.value)}
              placeholder="admin@example.com"
              sx={{ mb: 2 }}
              disabled={!smtpEnabled}
              helperText="多个收件人用逗号分隔"
            />
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button
                variant="contained"
                size="small"
                onClick={saveSmtp}
                sx={{ background: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)' }}
              >
                保存
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SendIcon />}
                onClick={() => handleTestNotification('smtp')}
                disabled={!smtpEnabled || !smtpHost || !smtpTo}
              >
                测试发送
              </Button>
            </Box>
            <NotificationTest
              testing={testing}
              result={testResults['smtp'] || null}
              onTest={() => handleTestNotification('smtp')}
            />
          </AccordionDetails>
        </Accordion>

        {/* Basic Auth Settings */}
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Lock sx={{ color: theme.palette.primary.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
              访问认证
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            配置 Basic Auth 认证信息，保护 API 和页面访问。留空则不启用认证。
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <TextField
              label="用户名"
              value={authUser}
              onChange={(e) => setAuthUser(e.target.value)}
              placeholder="admin"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="密码"
              value={authPass}
              onChange={(e) => setAuthPass(e.target.value)}
              type="password"
              placeholder="••••••••"
            />
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={saveAuth}
            sx={{ background: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)' }}
          >
            保存认证设置
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};

export default SettingsPage;
