import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getAllSettings, getSettingValue } from '../models/setting';
import { Task, NotificationChannel } from '../types';

/**
 * Send a failure notification for a task.
 * Reads notification settings from the database and sends via
 * all enabled channels (DingTalk, Feishu, SMTP).
 * Notifications are sent asynchronously and failures are only logged.
 */
export async function sendFailureNotification(task: Task, errorMessage: string): Promise<void> {
  const settings = getAllSettings();

  const title = `GitSync 同步失败告警`;
  const text = `任务「${task.name}」同步失败\n` +
    `源仓库: ${task.sourceRepo}\n` +
    `目标仓库: ${task.targetRepo}\n` +
    `错误信息: ${errorMessage}\n` +
    `时间: ${new Date().toLocaleString('zh-CN')}`;

  sendToAllChannels(settings, title, text);
}

/**
 * Send a success notification for a task (if notify_on_success is enabled).
 */
export async function sendSuccessNotification(task: Task, duration: number): Promise<void> {
  const settings = getAllSettings();

  // Only send if notify_on_success is enabled
  if (settings.notify_on_success !== true && settings.notify_on_success !== 'true') {
    return;
  }

  const title = `GitSync 同步成功`;
  const durationStr = duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`;
  const text = `任务「${task.name}」同步成功\n` +
    `源仓库: ${task.sourceRepo}\n` +
    `目标仓库: ${task.targetRepo}\n` +
    `耗时: ${durationStr}\n` +
    `时间: ${new Date().toLocaleString('zh-CN')}`;

  sendToAllChannels(settings, title, text);
}

/**
 * Send notification to all enabled channels.
 */
function sendToAllChannels(settings: Record<string, any>, title: string, text: string): void {
  // Send DingTalk notification if enabled
  if (settings.dingtalk_enabled === true || settings.dingtalk_enabled === 'true') {
    sendDingTalk(
      settings.dingtalk_webhook as string || '',
      settings.dingtalk_secret as string || '',
      title,
      text
    ).catch(err => console.error('DingTalk notification failed:', err.message));
  }

  // Send Feishu notification if enabled
  if (settings.feishu_enabled === true || settings.feishu_enabled === 'true') {
    sendFeishu(
      settings.feishu_webhook as string || '',
      settings.feishu_secret as string || '',
      title,
      text
    ).catch(err => console.error('Feishu notification failed:', err.message));
  }

  // Send SMTP notification if enabled
  if (settings.smtp_enabled === true || settings.smtp_enabled === 'true') {
    sendSmtp(
      {
        host: settings.smtp_host as string || '',
        port: Number(settings.smtp_port) || 465,
        secure: settings.smtp_secure !== false && settings.smtp_secure !== 'false',
        user: settings.smtp_user as string || '',
        pass: settings.smtp_pass as string || '',
        from: settings.smtp_from as string || '',
        to: settings.smtp_to as string || '',
      },
      title,
      text
    ).catch(err => console.error('SMTP notification failed:', err.message));
  }

  // Send generic webhook if enabled
  if (settings.webhook_enabled === true || settings.webhook_enabled === 'true') {
    sendWebhook(
      settings.webhook_url as string || '',
      title,
      text
    ).catch(err => console.error('Webhook notification failed:', err.message));
  }
}

/**
 * Send a DingTalk webhook notification.
 * Supports HMAC-SHA256 signature verification.
 */
export async function sendDingTalk(
  webhook: string,
  secret: string,
  title: string,
  text: string
): Promise<{ success: boolean; message: string }> {
  if (!webhook) {
    return { success: false, message: 'DingTalk webhook URL not configured' };
  }

  let url = webhook;

  // Generate signed URL if secret is provided
  if (secret) {
    const timestamp = Date.now();
    const stringToSign = `${timestamp}\n${secret}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(stringToSign);
    const sign = encodeURIComponent(hmac.digest('base64'));
    url = `${webhook}&timestamp=${timestamp}&sign=${sign}`;
  }

  const body = {
    msgtype: 'markdown',
    markdown: {
      title,
      text: `### ${title}\n\n${text.replace(/\n/g, '\n\n')}`,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json() as any;
    if (result.errcode === 0) {
      return { success: true, message: 'DingTalk notification sent' };
    } else {
      return { success: false, message: result.errmsg || 'DingTalk API error' };
    }
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Send a Feishu webhook notification.
 * Supports HMAC-SHA256 signature verification per Feishu official docs.
 */
export async function sendFeishu(
  webhook: string,
  secret: string,
  title: string,
  text: string
): Promise<{ success: boolean; message: string }> {
  if (!webhook) {
    return { success: false, message: 'Feishu webhook URL not configured' };
  }

  const body: any = {
    msg_type: 'interactive',
    card: {
      header: {
        title: {
          tag: 'plain_text',
          content: title,
        },
        template: 'red',
      },
      elements: [
        {
          tag: 'markdown',
          content: text,
        },
      ],
    },
  };

  // Generate signature if secret is provided
  // Feishu signature: timestamp + "\n" + secret → HMAC-SHA256 with empty string as key → base64
  if (secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = `${timestamp}\n${secret}`;
    const hmac = crypto.createHmac('sha256', '');
    hmac.update(stringToSign);
    const sign = hmac.digest('base64');
    body.timestamp = String(timestamp);
    body.sign = sign;
  }

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json() as any;
    if (result.code === 0 || result.StatusCode === 0) {
      return { success: true, message: 'Feishu notification sent' };
    } else {
      return { success: false, message: result.msg || 'Feishu API error' };
    }
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/** SMTP configuration */
interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
}

/**
 * Send an email notification via SMTP.
 */
export async function sendSmtp(
  smtpConfig: SmtpConfig,
  title: string,
  text: string
): Promise<{ success: boolean; message: string }> {
  if (!smtpConfig.host || !smtpConfig.to) {
    return { success: false, message: 'SMTP host or recipient not configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
    });

    await transporter.sendMail({
      from: smtpConfig.from || smtpConfig.user,
      to: smtpConfig.to,
      subject: title,
      text: text,
      html: `<h2>${title}</h2><pre style="font-family: monospace; line-height: 1.6;">${text}</pre>`,
    });

    return { success: true, message: 'Email notification sent' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Test a notification channel by sending a test message.
 */
export async function testNotification(channel: NotificationChannel): Promise<{ success: boolean; message: string }> {
  const settings = getAllSettings();
  const title = 'GitSync 通知测试';
  const text = `这是一条来自 GitSync 的测试通知。\n时间: ${new Date().toLocaleString('zh-CN')}`;

  switch (channel) {
    case 'dingtalk':
      return sendDingTalk(
        settings.dingtalk_webhook as string || '',
        settings.dingtalk_secret as string || '',
        title,
        text
      );
    case 'feishu':
      return sendFeishu(
        settings.feishu_webhook as string || '',
        settings.feishu_secret as string || '',
        title,
        text
      );
    case 'smtp':
      return sendSmtp(
        {
          host: settings.smtp_host as string || '',
          port: Number(settings.smtp_port) || 465,
          secure: settings.smtp_secure !== false && settings.smtp_secure !== 'false',
          user: settings.smtp_user as string || '',
          pass: settings.smtp_pass as string || '',
          from: settings.smtp_from as string || '',
          to: settings.smtp_to as string || '',
        },
        title,
        text
      );
    case 'webhook':
      return sendWebhook(
        settings.webhook_url as string || '',
        title,
        text
      );
    default:
      return { success: false, message: `Unknown notification channel: ${channel}` };
  }
}

/**
 * Send a generic webhook notification (POST JSON).
 */
export async function sendWebhook(
  url: string,
  title: string,
  text: string
): Promise<{ success: boolean; message: string }> {
  if (!url) {
    return { success: false, message: 'Webhook URL not configured' };
  }

  const body = {
    title,
    text,
    timestamp: new Date().toISOString(),
    source: 'GitSync',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return { success: true, message: 'Webhook notification sent' };
    } else {
      return { success: false, message: `Webhook returned status ${response.status}` };
    }
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
