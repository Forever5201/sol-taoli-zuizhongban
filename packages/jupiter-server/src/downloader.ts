/**
 * Jupiter CLI 下载器
 * 
 * 自动从GitHub下载jupiter-cli二进制文件
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import axios from 'axios';
import * as decompress from 'decompress';
import { 
  DownloadOptions, 
  DownloadProgress, 
  PlatformInfo,
  JupiterServerError,
  ErrorType 
} from './types';
import { logger } from '@solana-arb-bot/core';

const downloadLogger = logger.child({ module: 'jupiter-server:downloader' });

/**
 * Jupiter CLI 下载器
 */
export class JupiterDownloader {
  private static readonly GITHUB_REPO = 'jup-ag/jupiter-quote-api-node';
  private static readonly GITHUB_API = 'https://api.github.com';
  private static readonly DEFAULT_BIN_DIR = path.join(process.cwd(), 'bin');

  /**
   * 检测当前平台
   */
  static detectPlatform(): PlatformInfo {
    const platform = process.platform;
    const arch = process.arch;

    downloadLogger.debug(`Detected platform: ${platform}-${arch}`);

    // 确定操作系统
    let os: 'linux' | 'darwin' | 'win32';
    if (platform === 'linux') {
      os = 'linux';
    } else if (platform === 'darwin') {
      os = 'darwin';
    } else if (platform === 'win32') {
      os = 'win32';
    } else {
      throw new JupiterServerError(
        ErrorType.DOWNLOAD_FAILED,
        `Unsupported platform: ${platform}`
      );
    }

    // 确定架构
    if (arch !== 'x64' && arch !== 'arm64') {
      throw new JupiterServerError(
        ErrorType.DOWNLOAD_FAILED,
        `Unsupported architecture: ${arch}`
      );
    }

    // 确定二进制文件名
    const binaryName = os === 'win32' ? 'jupiter-cli.exe' : 'jupiter-cli';

    // 构建下载URL（基于平台）
    // 注意：实际URL需要根据Jupiter的发布格式调整
    let downloadUrl = '';
    if (os === 'linux' && arch === 'x64') {
      downloadUrl = 'linux-x86_64';
    } else if (os === 'darwin' && arch === 'x64') {
      downloadUrl = 'darwin-x86_64';
    } else if (os === 'darwin' && arch === 'arm64') {
      downloadUrl = 'darwin-aarch64';
    } else if (os === 'win32' && arch === 'x64') {
      downloadUrl = 'windows-x86_64';
    } else {
      downloadUrl = `${os}-${arch}`;
    }

    return {
      os,
      arch,
      binaryName,
      downloadUrl,
    };
  }

  /**
   * 获取最新版本号
   */
  static async getLatestVersion(): Promise<string> {
    try {
      downloadLogger.info('Fetching latest Jupiter CLI version...');

      const response = await axios.get(
        `${this.GITHUB_API}/repos/${this.GITHUB_REPO}/releases/latest`,
        {
          headers: {
            'User-Agent': 'Solana-Arb-Bot',
          },
          timeout: 10000,
        }
      );

      const version = response.data.tag_name;
      downloadLogger.info(`Latest version: ${version}`);

      return version;
    } catch (error: any) {
      downloadLogger.error(`Failed to fetch latest version: ${error.message}`);
      throw new JupiterServerError(
        ErrorType.DOWNLOAD_FAILED,
        'Failed to fetch latest version from GitHub',
        error
      );
    }
  }

  /**
   * 构建下载URL
   */
  static buildDownloadUrl(version: string, platformInfo: PlatformInfo): string {
    // 注意：这是一个示例URL格式
    // 实际URL需要根据Jupiter的发布格式调整
    // 
    // 常见格式：
    // https://github.com/jup-ag/jupiter-quote-api-node/releases/download/v1.0.0/jupiter-cli-linux-x86_64.tar.gz
    
    const baseUrl = `https://github.com/${this.GITHUB_REPO}/releases/download`;
    const filename = `jupiter-cli-${platformInfo.downloadUrl}`;
    
    // 根据操作系统选择压缩格式
    const extension = platformInfo.os === 'win32' ? '.zip' : '.tar.gz';
    
    return `${baseUrl}/${version}/${filename}${extension}`;
  }

  /**
   * 下载文件
   */
  static async downloadFile(
    url: string,
    outputPath: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    try {
      downloadLogger.info(`Downloading from: ${url}`);
      downloadLogger.info(`Saving to: ${outputPath}`);

      // 确保目录存在
      await fs.ensureDir(path.dirname(outputPath));

      // 创建写入流
      const writer = fs.createWriteStream(outputPath);

      // 发起下载请求
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Solana-Arb-Bot',
        },
        timeout: 300000, // 5分钟超时
      });

      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;
      let lastReportTime = Date.now();
      const startTime = Date.now();

      // 监听下载进度
      response.data.on('data', (chunk: Buffer) => {
        downloadedSize += chunk.length;

        // 每500ms报告一次进度
        const now = Date.now();
        if (onProgress && now - lastReportTime > 500) {
          const elapsed = (now - startTime) / 1000; // 秒
          const speed = downloadedSize / elapsed;
          const percent = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0;

          onProgress({
            total: totalSize,
            downloaded: downloadedSize,
            percent,
            speed,
          });

          lastReportTime = now;
        }
      });

      // 将响应流导入文件
      response.data.pipe(writer);

      // 等待下载完成
      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // 最后一次进度报告
      if (onProgress && totalSize > 0) {
        onProgress({
          total: totalSize,
          downloaded: totalSize,
          percent: 100,
          speed: downloadedSize / ((Date.now() - startTime) / 1000),
        });
      }

      downloadLogger.info('Download completed');
    } catch (error: any) {
      downloadLogger.error(`Download failed: ${error.message}`);
      
      // 清理失败的文件
      try {
        await fs.remove(outputPath);
      } catch {}

      throw new JupiterServerError(
        ErrorType.DOWNLOAD_FAILED,
        'Failed to download Jupiter CLI',
        error
      );
    }
  }

  /**
   * 解压文件
   */
  static async extractArchive(
    archivePath: string,
    outputDir: string
  ): Promise<string> {
    try {
      downloadLogger.info(`Extracting: ${archivePath}`);
      downloadLogger.info(`Output directory: ${outputDir}`);

      // 确保输出目录存在
      await fs.ensureDir(outputDir);

      // 解压
      const files = await decompress(archivePath, outputDir);

      if (files.length === 0) {
        throw new Error('No files extracted from archive');
      }

      downloadLogger.info(`Extracted ${files.length} files`);

      // 查找二进制文件
      const platformInfo = this.detectPlatform();
      const binaryFile = files.find(f => 
        f.path.includes('jupiter-cli') || 
        f.path.endsWith(platformInfo.binaryName)
      );

      if (!binaryFile) {
        throw new Error(`Binary file not found in archive: ${platformInfo.binaryName}`);
      }

      const binaryPath = path.join(outputDir, binaryFile.path);
      downloadLogger.info(`Binary extracted to: ${binaryPath}`);

      // 设置执行权限（Unix系统）
      if (platformInfo.os !== 'win32') {
        await fs.chmod(binaryPath, 0o755);
        downloadLogger.debug('Execute permission set');
      }

      return binaryPath;
    } catch (error: any) {
      downloadLogger.error(`Extraction failed: ${error.message}`);
      throw new JupiterServerError(
        ErrorType.DOWNLOAD_FAILED,
        'Failed to extract Jupiter CLI',
        error
      );
    }
  }

  /**
   * 验证二进制文件
   */
  static async validateBinary(binaryPath: string): Promise<boolean> {
    try {
      // 检查文件存在
      if (!await fs.pathExists(binaryPath)) {
        return false;
      }

      // 检查文件大小（至少1MB）
      const stats = await fs.stat(binaryPath);
      if (stats.size < 1024 * 1024) {
        downloadLogger.warn(`Binary file too small: ${stats.size} bytes`);
        return false;
      }

      // 检查执行权限（Unix系统）
      if (process.platform !== 'win32') {
        try {
          await fs.access(binaryPath, fs.constants.X_OK);
        } catch {
          downloadLogger.warn('Binary not executable');
          return false;
        }
      }

      downloadLogger.info('Binary validation passed');
      return true;
    } catch (error: any) {
      downloadLogger.error(`Binary validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 完整下载流程
   */
  static async download(options: DownloadOptions = {}): Promise<string> {
    const {
      version,
      targetPath,
      forceDownload = false,
      onProgress,
    } = options;

    try {
      downloadLogger.info('===== Jupiter CLI Download Start =====');

      // 1. 检测平台
      const platformInfo = this.detectPlatform();
      downloadLogger.info(`Platform: ${platformInfo.os}-${platformInfo.arch}`);

      // 2. 确定目标路径
      const binDir = targetPath || this.DEFAULT_BIN_DIR;
      const finalBinaryPath = path.join(binDir, platformInfo.binaryName);

      // 3. 检查是否已存在
      if (!forceDownload && await this.validateBinary(finalBinaryPath)) {
        downloadLogger.info(`Jupiter CLI already exists: ${finalBinaryPath}`);
        return finalBinaryPath;
      }

      // 4. 获取版本号
      const targetVersion = version || await this.getLatestVersion();
      downloadLogger.info(`Target version: ${targetVersion}`);

      // 5. 构建下载URL
      const downloadUrl = this.buildDownloadUrl(targetVersion, platformInfo);

      // 6. 下载文件
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.ensureDir(tempDir);
      
      const archiveExtension = platformInfo.os === 'win32' ? '.zip' : '.tar.gz';
      const archivePath = path.join(tempDir, `jupiter-cli${archiveExtension}`);

      await this.downloadFile(downloadUrl, archivePath, onProgress);

      // 7. 解压文件
      const extractedPath = await this.extractArchive(archivePath, binDir);

      // 8. 移动到最终位置（如果需要）
      if (extractedPath !== finalBinaryPath) {
        await fs.move(extractedPath, finalBinaryPath, { overwrite: true });
        downloadLogger.info(`Moved binary to: ${finalBinaryPath}`);
      }

      // 9. 验证
      if (!await this.validateBinary(finalBinaryPath)) {
        throw new Error('Binary validation failed after download');
      }

      // 10. 清理临时文件
      await fs.remove(tempDir);
      downloadLogger.info('Cleaned up temporary files');

      downloadLogger.info('===== Jupiter CLI Download Complete =====');
      return finalBinaryPath;
    } catch (error: any) {
      downloadLogger.error(`Download process failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查更新
   */
  static async checkForUpdates(currentBinaryPath: string): Promise<boolean> {
    try {
      // 这里可以实现版本比较逻辑
      // 当前简化版本：总是返回false
      return false;
    } catch (error: any) {
      downloadLogger.error(`Failed to check updates: ${error.message}`);
      return false;
    }
  }
}
