## Plan

### Phase 1: Quick Fixes
1. **Add Vicky's email** (`vickyvpurohit@gmail.com`) to WebsiteControls allowed list

### Phase 2: Expand Website Controls (20 new controls)
2. **Database migration** — Add 20 new columns to `website_controls` table:
   - **Security**: `rate_limit_enabled`, `rate_limit_max_requests`, `captcha_enabled`, `ip_blocking_enabled`, `max_login_attempts`, `session_timeout_minutes`
   - **UI/Appearance**: `default_theme`, `custom_logo_url`, `primary_color_override`, `font_size_default`
   - **Notifications**: `email_notifications_enabled`, `push_notifications_enabled`, `auto_reply_enabled`, `auto_reply_message`
   - **Content/Moderation**: `profanity_filter_enabled`, `max_upload_size_mb`, `max_message_length`
   - **Credits/Access**: `free_credits_enabled`, `free_credits_end_date`, `free_credits_amount`

3. **Update WebsiteControlPanel UI** — Add sections for all 20 new controls

### Phase 3: Email Enhancement
4. **Set up branded auth email templates** using Lovable's built-in email system
5. **Send email notification when admin sets credits** — Add email trigger in SetUserCreditsPanel

### Phase 4: App Generator Upgrade
6. **More framework options** (React Native, Flutter, Next.js templates)
7. **Better AI prompts** with improved code quality
8. **Template gallery** with pre-built app templates
9. **Live preview** of generated apps
