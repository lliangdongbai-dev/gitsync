import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Tooltip,
  IconButton,
  useTheme,
  Box,
  Collapse,
  Snackbar,
  Alert,
} from '@mui/material';
import { CheckCircle, Error, Schedule, TouchApp, Delete, ContentCopy, ExpandMore, ExpandLess, AccountTree, LocalOffer } from '@mui/icons-material';
import { SyncLog, SyncDetail } from '../types';

interface SyncLogTableProps {
  logs: SyncLog[];
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onDelete?: (id: string) => void;
}

/** Format duration in milliseconds to human-readable string */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}分${remainingSeconds}秒`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}时${remainingMinutes}分`;
}

/** Sync log table component with pagination */
const SyncLogTable: React.FC<SyncLogTableProps> = ({
  logs,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onDelete,
}) => {
  const theme = useTheme();
  const totalPages = Math.ceil(total / rowsPerPage);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setSnackbar({ open: true, message: '已复制到剪贴板' });
    }).catch(() => {
      // Fallback for non-HTTPS or older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setSnackbar({ open: true, message: '已复制到剪贴板' });
    });
  };

  return (
    <Box>
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                bgcolor: theme.palette.mode === 'dark'
                  ? 'rgba(99,102,241,0.1)'
                  : 'rgba(99,102,241,0.05)',
              }}
            >
              <TableCell sx={{ fontWeight: 700 }}>时间</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>任务名称</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>耗时</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Commit数</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>触发方式</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>错误信息</TableCell>
              {onDelete && <TableCell sx={{ fontWeight: 700 }}>操作</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={onDelete ? 8 : 7} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    暂无同步日志
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                let detail: SyncDetail | null = null;
                try {
                  if (log.detail) detail = JSON.parse(log.detail) as SyncDetail;
                } catch { /* ignore */ }

                return (
                  <React.Fragment key={log.id}>
                    <TableRow
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.04)'
                            : 'rgba(99,102,241,0.03)',
                        },
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {new Date(log.startTime).toLocaleString('zh-CN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {log.taskName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={log.status === 'success' ? <CheckCircle sx={{ fontSize: 14 }} /> : <Error sx={{ fontSize: 14 }} />}
                          label={log.status === 'success' ? '成功' : '失败'}
                          color={log.status === 'success' ? 'success' : 'error'}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDuration(log.duration)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {log.commitCount}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={log.triggerType === 'cron' ? <Schedule sx={{ fontSize: 14 }} /> : <TouchApp sx={{ fontSize: 14 }} />}
                          label={log.triggerType === 'cron' ? '定时' : '手动'}
                          variant="outlined"
                          size="small"
                          sx={{ fontSize: '0.72rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        {log.errorMessage ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: theme.palette.error.main,
                                fontSize: '0.78rem',
                              }}
                            >
                              {log.errorMessage}
                            </Typography>
                            <Tooltip title="复制错误信息" arrow>
                              <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleCopy(log.errorMessage!, e); }}
                                sx={{ color: theme.palette.text.secondary, p: 0.3 }}
                              >
                                <ContentCopy sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      {onDelete && (
                        <TableCell>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(log.id); }} sx={{ color: theme.palette.error.main }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>

                    {/* Expandable detail row */}
                    <TableRow>
                      <TableCell colSpan={onDelete ? 8 : 7} sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 1 }}>
                            {detail ? (
                              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                {/* Branches */}
                                {detail.branches.length > 0 && (
                                  <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                      <AccountTree sx={{ fontSize: 16, color: theme.palette.primary.main }} />
                                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                        分支 ({detail.branches.length})
                                      </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                      {detail.branches.map((b: any, i: number) => (
                                        <Chip
                                          key={i}
                                          label={`${b.name}: ${b.commits ?? 0} commits`}
                                          size="small"
                                          variant="outlined"
                                          color={(b.commits ?? 0) > 0 ? 'primary' : 'default'}
                                          sx={{ fontSize: '0.7rem' }}
                                        />
                                      ))}
                                    </Box>
                                  </Box>
                                )}
                                {/* Tags */}
                                {detail.tags.length > 0 && (
                                  <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                      <LocalOffer sx={{ fontSize: 16, color: '#F59E0B' }} />
                                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                        标签 ({detail.tags.length})
                                      </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                      {detail.tags.map((t: any, i: number) => (
                                        <Chip
                                          key={i}
                                          label={`${t.name}${t.isNew ? ' (新)' : ''}`}
                                          size="small"
                                          variant="outlined"
                                          color={t.isNew ? 'success' : 'warning'}
                                          sx={{ fontSize: '0.7rem' }}
                                        />
                                      ))}
                                    </Box>
                                  </Box>
                                )}
                                {/* Summary */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    模式: {detail.mode === 'all' ? '全量镜像' : detail.mode === 'all_branches' ? '所有分支' : detail.mode === 'all_tags' ? '所有标签' : '自定义'}
                                  </Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    总计: {detail.totalCommits} commits
                                  </Typography>
                                </Box>
                              </Box>
                            ) : log.errorMessage ? (
                              <Typography variant="body2" sx={{ color: theme.palette.error.main, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.8rem' }}>
                                {log.errorMessage}
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="text.secondary">无详细信息</Typography>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2, gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            共 {total} 条
          </Typography>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i;
            } else if (page < 3) {
              pageNum = i;
            } else if (page > totalPages - 4) {
              pageNum = totalPages - 7 + i;
            } else {
              pageNum = page - 3 + i;
            }
            return (
              <IconButton
                key={pageNum}
                size="small"
                onClick={() => onPageChange(pageNum)}
                sx={{
                  bgcolor: pageNum === page ? theme.palette.primary.main : 'transparent',
                  color: pageNum === page ? '#fff' : theme.palette.text.secondary,
                  '&:hover': {
                    bgcolor: pageNum === page ? theme.palette.primary.dark : theme.palette.action.hover,
                  },
                  minWidth: 32,
                  height: 32,
                }}
              >
                {pageNum + 1}
              </IconButton>
            );
          })}
        </Box>
      )}
      {/* Copy Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={1500}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ borderRadius: 2, py: 0.5 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SyncLogTable;
