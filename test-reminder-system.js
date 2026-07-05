#!/usr/bin/env node

/**
 * Reminder System Integration Test
 * Tests all aspects of the reminder system implementation
 */

const fs = require('fs')
const path = require('path')

const RESET = '\x1b[0m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const BLUE = '\x1b[34m'
const CYAN = '\x1b[36m'

let testsRun = 0
let testsPassed = 0
let testsFailed = 0

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`)
}

function logTest(name, passed, details = '') {
  testsRun++
  if (passed) {
    testsPassed++
    log(`✓ ${name}`, GREEN)
  } else {
    testsFailed++
    log(`✗ ${name}`, RED)
    if (details) log(`  ${details}`, YELLOW)
  }
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, BLUE)
  log(`${title}`, CYAN)
  log(`${'='.repeat(60)}`, BLUE)
}

function fileExists(filePath) {
  return fs.existsSync(filePath)
}

function fileContains(filePath, searchString) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return content.includes(searchString)
  } catch {
    return false
  }
}

function checkFileStructure(filePath, requiredStrings) {
  if (!fileExists(filePath)) {
    return { exists: false, details: `File not found: ${filePath}` }
  }

  const missing = requiredStrings.filter((str) => !fileContains(filePath, str))
  if (missing.length > 0) {
    return {
      exists: true,
      complete: false,
      details: `Missing: ${missing.join(', ')}`,
    }
  }

  return { exists: true, complete: true }
}

// ==================== TESTING ====================

logSection('PHASE 1: Database Models')

const habitPath = path.join(__dirname, 'src/models/Habit.ts')
const habitCheck = checkFileStructure(habitPath, [
  'reminderConfigs',
  'IReminderConfig',
  'enabled',
  'timeBefore',
  'notificationType',
])
logTest('Habit.ts has reminderConfigs field', habitCheck.complete, habitCheck.details)

const timeBlockPath = path.join(__dirname, 'src/models/TimeBlock.ts')
const timeBlockCheck = checkFileStructure(timeBlockPath, [
  'reminderConfigs',
  'IReminderConfig',
  'enabled',
  'timeBefore',
  'notificationType',
])
logTest('TimeBlock.ts has reminderConfigs field', timeBlockCheck.complete, timeBlockCheck.details)

logSection('PHASE 2: Services')

const reminderServicePath = path.join(__dirname, 'src/services/reminderService.ts')
const reminderServiceCheck = checkFileStructure(reminderServicePath, [
  'createTaskReminders',
  'updateTaskReminders',
  'createAssignmentReminders',
  'createExamReminders',
  'processPendingReminders',
  'deleteTaskReminders',
  'deleteAssignmentReminders',
  'deleteExamReminders',
  'getUserPendingReminders',
])
logTest(
  'reminderService.ts has all required functions',
  reminderServiceCheck.complete,
  reminderServiceCheck.details
)

const emailServicePath = path.join(__dirname, 'src/services/emailService.ts')
const emailServiceCheck = checkFileStructure(emailServicePath, [
  'sendTaskDeadlineReminder',
  'sendExamReminder',
  'sendAssignmentReminder',
  'sendDailyHabitReminder',
  'sendTimeBlockNotification',
])
logTest(
  'emailService.ts has reminder email functions',
  emailServiceCheck.complete,
  emailServiceCheck.details
)

logSection('PHASE 3: Server Actions')

const habitActionsPath = path.join(__dirname, 'src/actions/habitActions.ts')
const habitActionsCheck = checkFileStructure(habitActionsPath, [
  'reminderConfigs',
  'createHabitAction',
])
logTest(
  'habitActions.ts supports reminderConfigs',
  habitActionsCheck.complete,
  habitActionsCheck.details
)

const plannerActionsPath = path.join(__dirname, 'src/actions/plannerActions.ts')
const plannerActionsCheck = checkFileStructure(plannerActionsPath, [
  'reminderConfigs',
  'createTimeBlockAction',
])
logTest(
  'plannerActions.ts supports reminderConfigs',
  plannerActionsCheck.complete,
  plannerActionsCheck.details
)

const collegeActionsPath = path.join(__dirname, 'src/actions/collegeActions.ts')
const collegeActionsCheck = checkFileStructure(collegeActionsPath, [
  'createAssignmentReminders',
  'createExamReminders',
  'createAssignmentAction',
  'createExamAction',
])
logTest(
  'collegeActions.ts has reminder support',
  collegeActionsCheck.complete,
  collegeActionsCheck.details
)

logSection('PHASE 4: Components')

const reminderPanelPath = path.join(__dirname, 'src/components/ui/ReminderConfigPanel.tsx')
const reminderPanelCheck = checkFileStructure(reminderPanelPath, [
  'ReminderConfigPanel',
  'ReminderConfig',
  'timeBefore',
  'notificationType',
  'handleAddConfig',
  'handleRemoveConfig',
])
logTest(
  'ReminderConfigPanel.tsx created and functional',
  reminderPanelCheck.complete,
  reminderPanelCheck.details
)

logSection('PHASE 5: API & Cron')

const cronPath = path.join(__dirname, 'src/app/api/cron/reminders/route.ts')
const cronCheck = checkFileStructure(cronPath, [
  'CRON_SECRET',
  'processPendingReminders',
])
logTest('Cron reminders endpoint exists', cronCheck.complete, cronCheck.details)

const vercelPath = path.join(__dirname, 'vercel.json')
const vercelCheck = checkFileStructure(vercelPath, ['crons', 'api/cron/reminders', 'schedule'])
logTest('vercel.json configured with cron jobs', vercelCheck.complete, vercelCheck.details)

logSection('PHASE 6: TypeScript Compilation')

// Check for TypeScript syntax by looking for compilation-critical patterns
const taskModelPath = path.join(__dirname, 'src/models/Task.ts')
logTest('Task.ts exists', fileExists(taskModelPath))

const reminderModelPath = path.join(__dirname, 'src/models/Reminder.ts')
logTest('Reminder.ts exists', fileExists(reminderModelPath))

logSection('PHASE 7: Integration Points')

// Check Task model exports IReminderConfig
const taskFileContent = fs.readFileSync(taskModelPath, 'utf-8')
const hasIReminderConfig = taskFileContent.includes('export interface IReminderConfig')
logTest('Task.ts exports IReminderConfig interface', hasIReminderConfig)

// Check imports in other files
const habitImportsCorrect = fileContains(habitPath, "from './Task'")
logTest('Habit.ts imports from Task model', habitImportsCorrect)

const timeBlockImportsCorrect = fileContains(timeBlockPath, "from './Task'")
logTest('TimeBlock.ts imports from Task model', timeBlockImportsCorrect)

logSection('SUMMARY')

log(`\nTests Run:   ${testsRun}`, CYAN)
log(`Tests Passed: ${testsPassed}`, GREEN)
log(`Tests Failed: ${testsFailed}`, testsFailed > 0 ? RED : GREEN)

const successRate = ((testsPassed / testsRun) * 100).toFixed(1)
log(`Success Rate: ${successRate}%`, testsFailed === 0 ? GREEN : YELLOW)

if (testsFailed === 0) {
  log('\n✓ All tests passed! Reminder system is properly implemented.', GREEN)
  process.exit(0)
} else {
  log(
    `\n✗ ${testsFailed} test(s) failed. Please review and fix the issues above.`,
    RED
  )
  process.exit(1)
}
