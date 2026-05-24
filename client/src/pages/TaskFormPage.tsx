import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  InputAdornment,
  useTheme,
  Tooltip,
  Autocomplete,
  Checkbox,
} from '@mui/material';
import {
  Save,
  ArrowBack,
  VpnKey,
  Https,
  InfoOutlined,
  Refresh,
  CheckBoxOutlineBlank,
  CheckBox as CheckBoxIcon,
} from '@mui/icons-material';
import { useTasks } from '../hooks/useTasks';
import { listBranches } from '../api';
import { AuthType, CreateTaskReq, UpdateTaskReq, Task, BranchesConfig, BranchSyncMode } from '../types';

/** Frequency preset options in minutes */
const FREQUENCY_PRESETS = [
  { label: '5分钟', value: 5 },
  { label: '10分钟', value: 10 },
  { label: '30分钟', value: 30 },
  { label: '1小时', value: 60 },
  { label: '1天', value: 1440 },
];

/** Quick select mode options */
const SYNC_MODE_OPTIONS: { label: string; value: BranchSyncMode | 'custom'; description: string }[] = [
  { label: '所有分支 + 标签', value: 'all', description: '同步全部分支和标签（完整镜像）' },
  { label: '仅所有分支', value: 'all_branches', description: '同步全部分支，不同步标签' },
  { label: '仅所有标签', value: 'all_tags', description: '仅同步标签，不同步分支' },
  { label: '自定义选择', value: 'custom', description: '手动选择要同步的分支和标签' },
];

/** Reusable auth config section component */
const AuthConfigSection: React.FC<{
  label: string;
  authType: AuthType;
  onAuthTypeChange: (value: AuthType) => void;
  httpsToken: string;
  onHttpsTokenChange: (value: string) => void;
  sshKeyName: string;
  onSshKeyNameChange: (value: string) => void;
  tokenPlaceholder?: string;
}> = ({ label, authType, onAuthTypeChange, httpsToken, onHttpsTokenChange, sshKeyName, onSshKeyNameChange, tokenPlaceholder }) => {
  const theme = useTheme();
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
          {label}认证方式
        </Typography>
        <Tooltip title={label === '源仓库' ? '用于从源仓库拉取代码的认证' : '用于向目标仓库推送代码的认证'}>
          <InfoOutlined sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
        </Tooltip>
      </Box>
      <ToggleButtonGroup
        value={authType}
        exclusive
        onChange={(_, value) => value && onAuthTypeChange(value)}
        size="small"
        sx={{ mb: 2 }}
      >
        <ToggleButton value="https_token" sx={{ px: 2.5, py: 0.5 }}>
          <Https sx={{ mr: 0.8, fontSize: 16 }} />
          HTTPS Token
        </ToggleButton>
        <ToggleButton value="ssh_key" sx={{ px: 2.5, py: 0.5 }}>
          <VpnKey sx={{ mr: 0.8, fontSize: 16 }} />
          SSH Key
        </ToggleButton>
      </ToggleButtonGroup>

      {authType === 'https_token' ? (
        <TextField
          fullWidth
          label={`${label} Token`}
          type="password"
          value={httpsToken}
          onChange={(e) => onHttpsTokenChange(e.target.value)}
          placeholder={tokenPlaceholder || 'ghp_xxxxxxxxxxxxx 或 gitlab token'}
          helperText={`用于${label === '源仓库' ? '拉取' : '推送'}代码的认证令牌`}
          size="small"
        />
      ) : (
        <TextField
          fullWidth
          label={`${label} SSH 私钥`}
          value={sshKeyName}
          onChange={(e) => onSshKeyNameChange(e.target.value)}
          placeholder="id_rsa"
          helperText="私钥文件名（如 id_rsa）或绝对路径。按顺序查找：① data/ssh_keys/ ② ~/.ssh/"
          size="small"
        />
      )}
    </Box>
  );
};

/** Parse branches config from JSON string */
function parseBranchesConfig(jsonStr: string | undefined): BranchesConfig {
  try {
    if (!jsonStr) return { mode: 'all' };
    return JSON.parse(jsonStr) as BranchesConfig;
  } catch {
    return { mode: 'all' };
  }
}

/** Task form page for creating and editing tasks */
const TaskFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const theme = useTheme();
  const isEditing = Boolean(id);

  const { createTask, updateTask, tasks } = useTasks();

  // Form state
  const [name, setName] = useState('');
  const [sourceRepo, setSourceRepo] = useState('');
  const [targetRepo, setTargetRepo] = useState('');
  const [syncFrequency, setSyncFrequency] = useState(30);
  // Source auth
  const [sourceAuthType, setSourceAuthType] = useState<AuthType>('https_token');
  const [sourceHttpsToken, setSourceHttpsToken] = useState('');
  const [sourceSshKeyName, setSourceSshKeyName] = useState('');
  // Target auth
  const [targetAuthType, setTargetAuthType] = useState<AuthType>('https_token');
  const [targetHttpsToken, setTargetHttpsToken] = useState('');
  const [targetSshKeyName, setTargetSshKeyName] = useState('');

  // Branch selection state
  const [syncMode, setSyncMode] = useState<BranchSyncMode | 'custom'>('all');
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [remoteBranches, setRemoteBranches] = useState<string[]>([]);
  const [remoteTags, setRemoteTags] = useState<string[]>([]);
  const [fetchingRefs, setFetchingRefs] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load existing task data for editing
  useEffect(() => {
    if (isEditing && id) {
      const task = tasks.find((t: Task) => t.id === id);
      if (task) {
        setName(task.name);
        setSourceRepo(task.sourceRepo);
        setTargetRepo(task.targetRepo);
        setSyncFrequency(task.syncFrequency);
        setSourceAuthType(task.sourceAuthType);
        setSourceHttpsToken(task.sourceHttpsToken || '');
        setSourceSshKeyName(task.sourceSshKeyName || '');
        setTargetAuthType(task.targetAuthType);
        setTargetHttpsToken(task.targetHttpsToken || '');
        setTargetSshKeyName(task.targetSshKeyName || '');

        // Parse branches config
        const config = parseBranchesConfig(task.branches);
        setSyncMode(config.mode || 'all');
        setSelectedBranches(config.branches || []);
        setSelectedTags(config.tags || []);
      }
    }
  }, [isEditing, id, tasks]);

  /** Fetch remote branches and tags from source repo */
  const handleFetchRefs = useCallback(async () => {
    if (!sourceRepo.trim()) {
      setSnackbar({ open: true, message: '请先输入源仓库 URL', severity: 'error' });
      return;
    }

    setFetchingRefs(true);
    setFetchError(null);

    try {
      const refs = await listBranches({
        repoUrl: sourceRepo,
        authType: sourceAuthType,
        httpsToken: sourceHttpsToken || undefined,
        sshKeyName: sourceSshKeyName || undefined,
      });
      setRemoteBranches(refs.branches);
      setRemoteTags(refs.tags);
      setSnackbar({ open: true, message: `获取成功：${refs.branches.length} 个分支，${refs.tags.length} 个标签`, severity: 'success' });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '获取远程分支失败';
      setFetchError(msg);
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setFetchingRefs(false);
    }
  }, [sourceRepo, sourceAuthType, sourceHttpsToken, sourceSshKeyName]);

  // Auto-fetch remote branches when switching to custom mode (if not already loaded)
  useEffect(() => {
    if (syncMode === 'custom' && remoteBranches.length === 0 && remoteTags.length === 0 && sourceRepo.trim() && !fetchingRefs && !fetchError) {
      handleFetchRefs();
    }
  }, [syncMode]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Build branches config JSON string */
  const buildBranchesJson = (): string => {
    const config: BranchesConfig = { mode: syncMode };
    if (syncMode === 'custom') {
      config.branches = selectedBranches;
      config.tags = selectedTags;
    }
    return JSON.stringify(config);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setSnackbar({ open: true, message: '请输入任务名称', severity: 'error' });
      return;
    }
    if (!sourceRepo.trim()) {
      setSnackbar({ open: true, message: '请输入源仓库 URL', severity: 'error' });
      return;
    }
    if (!targetRepo.trim()) {
      setSnackbar({ open: true, message: '请输入目标仓库 URL', severity: 'error' });
      return;
    }
    if (syncFrequency < 1) {
      setSnackbar({ open: true, message: '同步频率必须大于 0', severity: 'error' });
      return;
    }
    if (syncMode === 'custom' && selectedBranches.length === 0 && selectedTags.length === 0) {
      setSnackbar({ open: true, message: '自定义模式下请至少选择一个分支或标签', severity: 'error' });
      return;
    }

    setLoading(true);
    const branchesJson = buildBranchesJson();

    try {
      if (isEditing && id) {
        const req: UpdateTaskReq = {
          name,
          sourceRepo,
          targetRepo,
          branches: branchesJson,
          syncFrequency,
          sourceAuthType,
          sourceHttpsToken: sourceHttpsToken || undefined,
          sourceSshKeyName: sourceSshKeyName || undefined,
          targetAuthType,
          targetHttpsToken: targetHttpsToken || undefined,
          targetSshKeyName: targetSshKeyName || undefined,
        };
        const result = await updateTask(id, req);
        if (result) {
          setSnackbar({ open: true, message: '任务更新成功', severity: 'success' });
          setTimeout(() => navigate('/tasks'), 1000);
        } else {
          setSnackbar({ open: true, message: '更新失败', severity: 'error' });
        }
      } else {
        const req: CreateTaskReq = {
          name,
          sourceRepo,
          targetRepo,
          branches: branchesJson,
          syncFrequency,
          sourceAuthType,
          sourceHttpsToken: sourceHttpsToken || undefined,
          sourceSshKeyName: sourceSshKeyName || undefined,
          targetAuthType,
          targetHttpsToken: targetHttpsToken || undefined,
          targetSshKeyName: targetSshKeyName || undefined,
        };
        const result = await createTask(req);
        if (result) {
          setSnackbar({ open: true, message: '任务创建成功', severity: 'success' });
          setTimeout(() => navigate('/tasks'), 1000);
        } else {
          setSnackbar({ open: true, message: '创建失败', severity: 'error' });
        }
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || '操作失败', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const icon = <CheckBoxOutlineBlank fontSize="small" />;
  const checkedIcon = <CheckBoxIcon fontSize="small" />;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/tasks')}
          sx={{ color: theme.palette.text.secondary }}
        >
          返回
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.text.primary }}>
          {isEditing ? '编辑任务' : '新建任务'}
        </Typography>
      </Box>

      <Paper
        sx={{
          p: 4,
          maxWidth: 780,
          borderRadius: 3,
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        {/* Task Name */}
        <TextField
          fullWidth
          label="任务名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：生产环境代码同步"
          sx={{ mb: 3 }}
          required
        />

        {/* ===== Source Repo Section ===== */}
        <Box sx={{
          p: 2.5, mb: 3, borderRadius: 2,
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)'}`,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.03)',
        }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: theme.palette.primary.main }}>
            📥 源仓库（代码来源）
          </Typography>
          <TextField
            fullWidth label="源仓库 URL" value={sourceRepo}
            onChange={(e) => setSourceRepo(e.target.value)}
            placeholder="https://github.com/source/repo.git 或 git@github.com:source/repo.git"
            sx={{ mb: 2.5 }} required helperText="支持 HTTPS 和 SSH 格式" size="small"
          />
          <AuthConfigSection
            label="源仓库" authType={sourceAuthType} onAuthTypeChange={setSourceAuthType}
            httpsToken={sourceHttpsToken} onHttpsTokenChange={setSourceHttpsToken}
            sshKeyName={sourceSshKeyName} onSshKeyNameChange={setSourceSshKeyName}
            tokenPlaceholder="ghp_xxxxxxxxxxxxx 或 gitlab token"
          />
        </Box>

        {/* ===== Target Repo Section ===== */}
        <Box sx={{
          p: 2.5, mb: 3, borderRadius: 2,
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(6,182,212,0.3)' : 'rgba(6,182,212,0.2)'}`,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(6,182,212,0.05)' : 'rgba(6,182,212,0.03)',
        }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#06B6D4' }}>
            📤 目标仓库（代码去向）
          </Typography>
          <TextField
            fullWidth label="目标仓库 URL" value={targetRepo}
            onChange={(e) => setTargetRepo(e.target.value)}
            placeholder="https://github.com/target/repo.git 或 git@github.com:target/repo.git"
            sx={{ mb: 2.5 }} required helperText="代码将被镜像推送到此仓库" size="small"
          />
          <AuthConfigSection
            label="目标仓库" authType={targetAuthType} onAuthTypeChange={setTargetAuthType}
            httpsToken={targetHttpsToken} onHttpsTokenChange={setTargetHttpsToken}
            sshKeyName={targetSshKeyName} onSshKeyNameChange={setTargetSshKeyName}
            tokenPlaceholder="目标仓库的 Token 或密码"
          />
        </Box>

        {/* ===== Branch Selection Section ===== */}
        <Box sx={{
          p: 2.5, mb: 3, borderRadius: 2,
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)'}`,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.03)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#10B981' }}>
              🌿 同步范围（分支 / 标签）
            </Typography>
            <Button
              size="small"
              startIcon={fetchingRefs ? <CircularProgress size={14} /> : <Refresh />}
              onClick={handleFetchRefs}
              disabled={fetchingRefs || !sourceRepo.trim()}
              sx={{ textTransform: 'none' }}
            >
              获取远程分支
            </Button>
          </Box>

          {/* Sync mode quick select */}
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: theme.palette.text.primary }}>
              同步模式
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {SYNC_MODE_OPTIONS.map((option) => (
                <Tooltip key={option.value} title={option.description}>
                  <Chip
                    label={option.label}
                    onClick={() => setSyncMode(option.value)}
                    variant={syncMode === option.value ? 'filled' : 'outlined'}
                    color={syncMode === option.value ? 'success' : 'default'}
                    sx={{ fontWeight: 600 }}
                    size="small"
                  />
                </Tooltip>
              ))}
            </Box>
          </Box>

          {/* Custom branch/tag selection */}
          {syncMode === 'custom' && (
            <Box>
              {fetchError && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 1.5 }}>
                  {fetchError}。你也可以手动输入分支/标签名称。
                </Alert>
              )}

              {/* Branch multi-select */}
              <Autocomplete
                multiple freeSolo options={remoteBranches} value={selectedBranches}
                onChange={(_, newValue) => setSelectedBranches(newValue as string[])}
                disableCloseOnSelect
                renderOption={(props, option, { selected }) => (
                  <li {...props}>
                    <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 8 }} checked={selected} />
                    {option}
                  </li>
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip {...getTagProps({ index })} key={option} label={option} size="small" color="primary" variant="outlined" />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} label="选择分支" placeholder={selectedBranches.length === 0 ? '输入或选择要同步的分支...' : ''} size="small"
                    helperText={remoteBranches.length > 0 ? `可选 ${remoteBranches.length} 个分支，也可手动输入` : '点击"获取远程分支"加载列表，或直接手动输入分支名'}
                  />
                )}
                sx={{ mb: 2.5 }}
              />

              {remoteBranches.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2.5, mt: -1.5 }}>
                  <Chip label="全选分支" size="small" variant="outlined" color="primary" onClick={() => setSelectedBranches([...remoteBranches])} sx={{ cursor: 'pointer' }} />
                  <Chip label="清空分支" size="small" variant="outlined" onClick={() => setSelectedBranches([])} sx={{ cursor: 'pointer' }} />
                </Box>
              )}

              {/* Tag multi-select */}
              <Autocomplete
                multiple freeSolo options={remoteTags} value={selectedTags}
                onChange={(_, newValue) => setSelectedTags(newValue as string[])}
                disableCloseOnSelect
                renderOption={(props, option, { selected }) => (
                  <li {...props}>
                    <Checkbox icon={icon} checkedIcon={checkedIcon} style={{ marginRight: 8 }} checked={selected} />
                    {option}
                  </li>
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip {...getTagProps({ index })} key={option} label={option} size="small" color="secondary" variant="outlined" />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} label="选择标签" placeholder={selectedTags.length === 0 ? '输入或选择要同步的标签...' : ''} size="small"
                    helperText={remoteTags.length > 0 ? `可选 ${remoteTags.length} 个标签，也可手动输入` : '点击"获取远程分支"加载列表，或直接手动输入标签名'}
                  />
                )}
                sx={{ mb: 1 }}
              />

              {remoteTags.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip label="全选标签" size="small" variant="outlined" color="secondary" onClick={() => setSelectedTags([...remoteTags])} sx={{ cursor: 'pointer' }} />
                  <Chip label="清空标签" size="small" variant="outlined" onClick={() => setSelectedTags([])} sx={{ cursor: 'pointer' }} />
                </Box>
              )}
            </Box>
          )}

          {/* Summary */}
          <Box sx={{ mt: 2, p: 1.5, borderRadius: 1.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
            <Typography variant="caption" color="text.secondary">
              📋 当前配置：
              {syncMode === 'all' && '同步所有分支和标签（完整镜像）'}
              {syncMode === 'all_branches' && '同步所有分支（不含标签）'}
              {syncMode === 'all_tags' && '仅同步所有标签（不含分支）'}
              {syncMode === 'custom' && (
                <>
                  {selectedBranches.length > 0 && `${selectedBranches.length} 个分支`}
                  {selectedBranches.length > 0 && selectedTags.length > 0 && ' + '}
                  {selectedTags.length > 0 && `${selectedTags.length} 个标签`}
                  {selectedBranches.length === 0 && selectedTags.length === 0 && '未选择任何分支或标签'}
                </>
              )}
            </Typography>
          </Box>
        </Box>

        {/* Sync Frequency */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600, color: theme.palette.text.primary }}>
            同步频率
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
            <TextField
              type="number" label="分钟" value={syncFrequency}
              onChange={(e) => setSyncFrequency(Math.max(1, parseInt(e.target.value) || 1))}
              sx={{ width: 150 }}
              InputProps={{ endAdornment: <InputAdornment position="end">分钟</InputAdornment> }}
              inputProps={{ min: 1 }} size="small"
            />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {FREQUENCY_PRESETS.map((preset) => (
                <Chip
                  key={preset.value} label={preset.label}
                  onClick={() => setSyncFrequency(preset.value)}
                  variant={syncFrequency === preset.value ? 'filled' : 'outlined'}
                  color={syncFrequency === preset.value ? 'primary' : 'default'}
                  sx={{ fontWeight: 600 }} size="small"
                />
              ))}
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">
            设置自动同步的时间间隔，最小1分钟
          </Typography>
        </Box>

        {/* Submit buttons */}
        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Save />}
            onClick={handleSubmit} disabled={loading}
            sx={{ background: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)', px: 4, py: 1.2 }}
          >
            {isEditing ? '保存修改' : '创建任务'}
          </Button>
          <Button variant="outlined" onClick={() => navigate('/tasks')} sx={{ px: 4, py: 1.2 }}>
            取消
          </Button>
        </Box>
      </Paper>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open} autoHideDuration={3000}
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

export default TaskFormPage;
