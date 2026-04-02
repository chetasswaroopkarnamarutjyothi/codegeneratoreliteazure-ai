## Phase 1: Database Changes
1. **Add `birthday` column** to `profiles` table
2. **Create `feedback` table** for user feedback
3. **Create `announcements` table** for admin announcements
4. **Create `website_controls` table** for admin site settings (maintenance mode, feature flags, registration toggle, banner message)
5. **Add `birthday_credits_granted_at` and `birthday_credits_expire_at`** to `user_points`
6. **Add `last_activity_check` and `half_year_penalty_applied`** to `user_points` for 6-month usage tracking

## Phase 2: Marketing Studio Fix
- Remove `@stackmind.com` domain enforcement completely
- Only check if user has admin role via `is_admin` RPC
- Admins can use any email (including `@gmail.com`)

## Phase 3: AI Model Selector
- Add a model picker dropdown to the code generation UI
- Let users choose from available models (Gemini 2.5 Pro, Flash, GPT-5, etc.)
- Pass selected model to the edge function

## Phase 4: Birthday Credits System
- Ask birthday during profile creation/completion
- On birthday, auto-grant 500 credits with 2-month expiry
- Check and expire birthday credits after 2 months

## Phase 5: 6-Month Usage Penalty
- Every 6 months, check if user used at least 10 credits
- If not, cut their daily credits in half for the next 6 months

## Phase 6: Feedback Page
- New `/feedback` page for users to submit feedback
- Categories: Bug Report, Feature Request, General Feedback
- Admins can view and respond in admin panel

## Phase 7: Announcements Page
- Admin can create/edit/delete announcements
- Users see announcements on dashboard or dedicated page
- Support pinning and priority

## Phase 8: Admin Website Control Panel
- Maintenance mode toggle (shows maintenance page to non-admins)
- Feature flags (enable/disable chat, IDE, video, etc.)
- User registration toggle (open/close signups)
- Custom banner/announcement for all users

## Phase 9: Enterprise Subscription Plan
- ₹20,000/month or ₹2,47,900/year
- 2,000 credits per employee per day
- Add to payment page and subscription logic

## Phase 10: Theme Simplification
- Remove "Hybrid Mix" theme
- Keep only: Light, Dark, System Default

## Phase 11: Security Hardening
- Review and tighten RLS policies
- Input validation on all forms
- Rate limiting considerations

## Phase 12: UI/UX Enhancements
- Improve post-auth connecting/loading page
- Better email templates for notifications
- Overall polish
