# Reminder System Testing Guide

## Overview
This guide provides step-by-step instructions to test the entire reminder system implementation.

## Prerequisites
- Application running (development server)
- User account created and authenticated
- SMTP configuration (or fallback console logging enabled)
- MongoDB connection working
- CRON_SECRET configured if running cron endpoint

## Testing Checklist

### Phase 1: Database Validation

**1.1 Verify Model Updates**
```bash
# Check Habit model has reminderConfigs
# Expected: Field exists in schema as array of {enabled, timeBefore, notificationType, emailSent}

# Check TimeBlock model has reminderConfigs  
# Expected: Field exists in schema as array of {enabled, timeBefore, notificationType, emailSent}
```

**1.2 MongoDB Collections**
```bash
# Connect to MongoDB and verify:
db.habits.findOne({reminderConfigs: {$exists: true}})
# Should return documents with reminderConfigs array

db.timeblocks.findOne({reminderConfigs: {$exists: true}})
# Should return documents with reminderConfigs array

db.reminders.find()
# Should show newly created reminder documents
```

### Phase 2: UI Component Testing

**2.1 Create Task with Default Reminders**
- Navigate to Dashboard → Tasks
- Create a new task with title, deadline
- Verify: Default reminders are auto-created (1 day, 2 hours)
- Check MongoDB: Task document has reminderConfigs populated

**2.2 Create Habit with Reminders**
- Navigate to Dashboard → Habits
- Create new habit (name, recurrence)
- Should see ReminderConfigPanel UI
- Add custom reminders via UI
- Save and verify: MongoDB Habit doc has reminderConfigs

**2.3 Create TimeBlock with Reminders**
- Navigate to Dashboard → Planner
- Add new time block (title, time, date)
- Add reminders via ReminderConfigPanel
- Save and verify: MongoDB TimeBlock doc has reminderConfigs

**2.4 Create Assignment with Reminders**
- Navigate to Dashboard → College → Subjects
- Add assignment to existing subject
- Verify: Default reminders created (1 day, 2 hours)
- Check MongoDB: Assignment has reminderConfigs

**2.5 Create Exam with Reminders**
- Navigate to Dashboard → College → Subjects
- Add exam to existing subject
- Verify: Default reminders created (1 day, 2 hours)
- Check MongoDB: Exam has reminderConfigs

### Phase 3: Reminder Document Verification

**3.1 Check Reminder Creation**
```javascript
// In MongoDB or via API query
db.reminders.find({relatedTo: "task"}).count()
// Should show reminders for created tasks

db.reminders.find({relatedTo: "exam"}).count()
// Should show reminders for created exams

db.reminders.find({relatedTo: "assignment"}).count()
// Should show reminders for created assignments

db.reminders.find({isSent: false}).count()
// Should show pending (unprocessed) reminders
```

**3.2 Verify Reminder Fields**
```javascript
db.reminders.findOne({relatedTo: "task"})
// Should have:
// - user: ObjectId
// - title: string
// - relatedTo: "task"|"exam"|"assignment"|"habit"|"timeblock"
// - relatedId: ObjectId
// - triggerTime: Date (calculated as deadline - timeBefore)
// - isSent: boolean (false for new)
// - channel: "email"|"in-app"|"both"
```

### Phase 4: Cron Job Testing

**4.1 Manual Cron Trigger (Development)**
```bash
# Create a past-due reminder manually for testing
# Set triggerTime to NOW or past time

# Call cron endpoint manually:
curl -X GET "http://localhost:3000/api/cron/reminders?secret=YOUR_CRON_SECRET"

# Expected response:
# {
#   "success": true,
#   "message": "Processed X reminder(s). Sent Y email(s)."
# }

# Check MongoDB after:
db.reminders.findOne({isSent: true})
# Reminders should be marked isSent: true
```

**4.2 Test with Overdue Reminder**
```javascript
// Create a reminder with past trigger time
const reminderDoc = {
  user: userId,
  title: "Test Reminder",
  relatedTo: "task",
  relatedId: taskId,
  triggerTime: new Date(Date.now() - 3600000), // 1 hour ago
  isSent: false,
  channel: "email"
}

db.reminders.insertOne(reminderDoc)

// Now trigger cron - should process this reminder
```

**4.3 Email Verification**
```bash
# Option 1: SMTP Configured
# Check email inbox for reminder email
# Verify subject: "Task Alert - Solo Leveling Dashboard"
# Verify content includes: Task title, dashboard link

# Option 2: Console Fallback (if SMTP not configured)
# Check terminal/logs for email output:
# ---
# --- EMAIL CRON REMINDER TRIGGERED ---
# To: user@example.com
# Reminder Text: [Task title...]
# ---
```

### Phase 5: In-App Notification Testing

**5.1 Create Notification Records**
- After cron processes email reminders, check Notification collection:
```javascript
db.notifications.find({type: "reminder"})
// Should show notification records created during processing
```

**5.2 User Dashboard Display**
- Log in and navigate to Dashboard → Notifications
- Should display processed reminders
- Click on notification → should navigate to relevant entity

### Phase 6: Edge Cases & Error Handling

**6.1 Multiple Reminders Per Entity**
```javascript
// Create task with 3 different reminders (5min, 1hour, 1day)
// Should create 3 separate Reminder documents in MongoDB
// Verify triggerTimes are correctly calculated

// Each should trigger independently when time arrives
```

**6.2 Disabled Reminders**
```javascript
// Create task with enabled=false in reminderConfigs
// Should NOT create Reminder document in MongoDB
// Verify: No reminders with this task's relatedId
```

**6.3 Reminder Deduplication**
```javascript
// Edit task twice without changing deadline
// Call updateTaskReminders twice
// Should not create duplicate reminders
// Verify: Old reminders deleted, new ones created
```

**6.4 Past Reminders**
```javascript
// Create reminder with trigger time in past
// Run cron
// Should NOT auto-trigger (only new reminders)
// Should mark isSent: false after cron processes
```

**6.5 Orphaned Reminders**
```javascript
// Delete a task via deleteTaskReminders
// All associated Reminder documents should be deleted
// Verify: db.reminders.find({relatedId: deletedTaskId}) returns 0
```

### Phase 7: Performance Testing

**7.1 Large Batch Processing**
```bash
# Create 100+ tasks/habits with reminders
# Run cron

# Monitor:
# - Response time (should be < 30 seconds)
# - Memory usage
# - Database query efficiency
# - Email sending queue (if applicable)
```

**7.2 Cron Schedule Validation**
```javascript
// vercel.json should have:
// - /api/cron/reminders: */5 * * * * (every 5 minutes)
// - /api/cron/time-notifications: 0 * * * * (every hour)

// Verify cron jobs run as scheduled in production
```

## Testing Results Template

```
Date: ___________
Environment: [ ] Local [ ] Staging [ ] Production

Phase 1 - Database Validation: [ ] Pass [ ] Fail
  Issues: ___________

Phase 2 - UI Component Testing: [ ] Pass [ ] Fail
  Issues: ___________

Phase 3 - Reminder Document Verification: [ ] Pass [ ] Fail
  Issues: ___________

Phase 4 - Cron Job Testing: [ ] Pass [ ] Fail
  Issues: ___________

Phase 5 - In-App Notification Testing: [ ] Pass [ ] Fail
  Issues: ___________

Phase 6 - Edge Cases: [ ] Pass [ ] Fail
  Issues: ___________

Phase 7 - Performance Testing: [ ] Pass [ ] Fail
  Issues: ___________

Overall Status: [ ] All Pass [ ] Some Fail [ ] Major Issues

Notes:
_________________________________________________
```

## Troubleshooting

### Issue: No reminders created
**Check:**
1. Model migrations applied? `reminderConfigs` field exists in MongoDB
2. Server actions accepting reminderConfigs parameter?
3. Reminder document creation logic executing?
4. MongoDB connection status

### Issue: Cron not triggering
**Check:**
1. CRON_SECRET environment variable set?
2. Vercel deployment includes vercel.json?
3. Cron endpoint URL accessible?
4. Check Vercel logs for execution status

### Issue: Emails not sending
**Check:**
1. SMTP credentials configured correctly?
2. Email template rendering properly?
3. User email address valid?
4. Check transporter logs for errors

### Issue: Old reminders re-triggering
**Check:**
1. isSent flag being set after processing?
2. Database update succeeding?
3. Cron fetching old vs. new reminders?

## Success Criteria

✅ **All reminders created with correct triggerTime calculations**
✅ **Cron endpoint processes pending reminders successfully**
✅ **Email notifications sent to user email addresses**
✅ **isSent flag set after processing**
✅ **UI allows configuration of reminders**
✅ **No duplicate or orphaned reminders**
✅ **Performance acceptable under load**
✅ **Edge cases handled gracefully**

## Sign-off

Tester: _________________
Date: _________________
Status: [ ] Ready for Production [ ] Needs Fixes
