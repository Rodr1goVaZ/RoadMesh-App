#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

## Incremental RoadMesh enhancements
user_problem_statement: "Correct uploaded logo including register; quick damage capture with photo and severity; share quotes via email/WhatsApp; workshop-wide license plate search; internal invoice PDF with logo/client/parts/labor. PT-PT."
backend:
  - task: "Managed photo upload/download, damage validation and tenant isolation"
    implemented: true
    working: NA
    needs_retesting: true
    file: "/app/backend/media_storage.py; /app/backend/server.py"
  - task: "Normalized vehicle search, contact-enriched quotes, snapshotted paginated invoice PDFs"
    implemented: true
    working: NA
    needs_retesting: true
    file: "/app/backend/server.py; /app/backend/pdf_documents.py"
frontend:
  - task: "Uploaded logo on login, register, dashboard and more"
    implemented: true
    working: true
    needs_retesting: true
    status_history:
      - agent: main
        working: true
        comment: "Screenshot confirmed login and register use the supplied exact JPEG."
  - task: "Vehicle search/detail, damage capture/history, quote sharing, contacts editing and PDF export"
    implemented: true
    working: NA
    needs_retesting: true
    status_history:
      - agent: main
        working: NA
        comment: "App loaded and search/detail rendered. Screenshot click picked a behind-screen reused quick-action testID; replaced all quick-action IDs with unique per-screen prefixes. Added searching placeholder to hide old results during debounce. No source errors: tsc and lints pass."
test_plan:
  current_focus: ["damage photo upload and persistence", "normalized plate search", "PDF binary/content/pagination/isolation", "email/WhatsApp URI and honest status", "logo on register"]
  test_all: false
agent_communication:
  - agent: main
    message: "Existing login credentials in memory/test_credentials.md confirmed. Photos now use managed storage media_id, old image_b64 documents remain readable; old tests expecting base64 creation need adapting intentionally. Run full new flows incl real storage, mobile viewport and tablet. Do not actually send email/WhatsApp messages. Validate compose URL recipients/body and that status stays rascunho until explicit confirmation. Native camera/mail clients/share sheets require device verification. If registering any test account, record credentials in memory/test_credentials.md."

## Follow-up verification
- Testing agent iteration_2: 29/29 backend tests passed; quote sharing/status/conversion, invoice export, mobile/tablet layout passed.
- Main follow-up after user requested transparent logo: generated transparent PNG preserving supplied artwork, stored in managed storage, public brand-only route. Screenshots show transparent logo on login and register without photo background.
- Gallery issue reported in iteration_2 is resolved as an automation timing issue: main screenshot 20260906_214005 used `async with page.expect_file_chooser()` BEFORE clicking `damage-gallery`, successfully received filechooser. Main screenshot 20260906_214110 selected JPEG via chooser.set_files, confirmed preview, actual upload/save HTTP201, displayed stored history image, and verified cancel/confirm delete (temporary record removed). No picker production-code change required.
- Metro1006 investigated by RCA: idle development socket only, stable process and continued functioning UI; no application outage.
- Test account credentials from regression suite have been documented in memory/test_credentials.md.
- Transparent-logo final PDF downloaded successfully with authentication; document analysis confirms logo has no blue/photo backdrop, correct client/vehicle/parts/labor/VAT/EUR totals and no clipping. Native camera and external app share sheets remain device-verification tasks, not verified in browser.