declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    DEEPSEEK_API_KEY?: string;
    DEEPSEEK_MODEL?: string;
    DEEPSEEK_BASE_URL?: string;
  }
}
