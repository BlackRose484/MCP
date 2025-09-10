# Software Requirements Specification (SRS) for TodoApp

This document provides a detailed specification of the requirements for the TodoApp system.

---

## 1. System Context Diagram

This diagram illustrates the boundaries of the TodoApp system and its interactions with external entities.

```mermaid
%%{init: {"flowchart": {"defaultRenderer": "elk"}} }%%
graph TD
    classDef system fill:#B4F8C8,stroke:#333,stroke-width:2px;
    classDef external fill:#F1F1F1,stroke:#333,stroke-width:2px;

    subgraph External Entities
        User[("User")]:::external
        AuthService[("Authentication Service")]:::external
        NotificationService[("Notification Service")]:::external
        EmailService[("Email Service")]:::external
    end

    subgraph TodoApp System
        TodoApp(("TodoApp")):::system
    end

    User -- "1. Manage Todos (Create, Read, Update, Delete)" --> TodoApp
    TodoApp -- "2. Todo Data (Lists, Tasks, Status)" --> User

    User -- "3. Authenticate (Login, Register)" --> AuthService
    AuthService -- "4. Authentication Token" --> TodoApp

    TodoApp -- "5. Send Push Notification" --> NotificationService
    NotificationService -- "6. Delivers Notification" --> User

    TodoApp -- "7. Send Email Reminder" --> EmailService
    EmailService -- "8. Delivers Email" --> User

```

### Data Flow Description

| No | Component | Incoming Flow | Outgoing Flow | Interface | Details |
| :-- | :--- | :--- | :--- | :--- | :--- |
| 1 | User → TodoApp | - | Manage Todos | GUI | User creates, views, updates, or deletes their todo lists and tasks through the web or mobile interface. |
| 2 | TodoApp → User | Todo Data | - | GUI | The system displays the user's todo lists, tasks, and their current status. |
| 3 | User → AuthService | - | Authenticate | API | User provides credentials (e.g., email/password, Google account) to log in or register. |
| 4 | AuthService → TodoApp | Authentication Token | - | API | The authentication service validates the user's credentials and sends a security token to the TodoApp system. |
| 5 | TodoApp → NotificationService | - | Send Push Notification | API | The system sends a request to the notification service to deliver a push notification to the user's device (e.g., task reminder). |
| 6 | NotificationService → User| Delivers Notification | - | Push | The notification service pushes the reminder to the user's registered device. |
| 7 | TodoApp → EmailService | - | Send Email Reminder | API | The system sends a request to the email service to deliver an email reminder to the user. |
| 8 | EmailService → User | Delivers Email | - | SMTP | The email service delivers the reminder to the user's inbox. |

---

## 2. Overview Model

This model provides a high-level view of the system's architecture, including user channels, core modules, and integrations with external partners.

```mermaid
graph LR
    classDef web fill:#BBDEFB,stroke:#BADCf6,stroke-width:1px;
    classDef mobile fill:#FFCDD2,stroke:#E57373,stroke-width:1px;
    classDef api fill:#E1BEE7,stroke:#BA68C8,stroke-width:1px;
    classDef user fill:#FFF9C4,stroke:#FDD835,stroke-width:1px;
    classDef system fill:#C8E6C9,stroke:#81C784,stroke-width:1px;
    classDef external fill:#F5F5F5,stroke:#9E9E9E,stroke-width:1px;

    subgraph Users
        U(User):::user
    end

    subgraph Channels
        WebApp(Web Application):::web
        MobileApp(Mobile App):::mobile
    end

    subgraph Core System
        UM(User Management):::system
        TM(Todo Management):::system
        NM(Notification Management):::system
    end

    subgraph External Partners
        AuthSvc(Authentication Service):::external
        PushSvc(Notification Service):::external
        EmailSvc(Email Service):::external
    end

    subgraph Interfaces
        AuthAPI(Auth API):::api
        PushAPI(Push Notification API):::api
        EmailAPI(Email API):::api
    end

    U --> WebApp
    U --> MobileApp

    WebApp --> UM
    WebApp --> TM
    MobileApp --> UM
    MobileApp --> TM

    UM --> AuthAPI --> AuthSvc
    TM --> NM
    NM --> PushAPI --> PushSvc
    NM --> EmailAPI --> EmailSvc
```

### Component Description

| Actor/System | Channel/Interface | Description (Input/Output) |
| :--- | :--- | :--- |
| **User** | - | A registered user who manages their tasks. |
| | Web Application | **Input**: User actions (login, create task, set reminder). <br> **Output**: Displays todo lists, tasks, and notifications. |
| | Mobile App | **Input**: User actions (login, create task, set reminder). <br> **Output**: Displays todo lists, tasks, and notifications. |
| **Core System**| - | The central TodoApp application. |
| | User Management | Handles user registration, authentication, and profile management. |
| | Todo Management | Manages the creation, updating, deletion, and organization of tasks and todo lists. |
| | Notification Management| Schedules and triggers reminders via push notifications and emails. |
| **External Partners** | - | Third-party services integrated with the system. |
| | Authentication Service | **Input**: User credentials. <br> **Output**: Authentication tokens or error responses. |
| | Notification Service | **Input**: Notification payload (message, recipient). <br> **Output**: Delivery status. |
| | Email Service | **Input**: Email content (subject, body, recipient). <br> **Output**: Delivery status. |

---

## 3. Entity Relationship Diagram (ERD)

This diagram shows the database schema for the TodoApp.

```mermaid
erDiagram
    USERS {
        int id PK
        string username
        string email
        string password_hash
        datetime created_at
        datetime updated_at
    }
    TODO_LISTS {
        int id PK
        int user_id FK
        string title
        datetime created_at
        datetime updated_at
    }
    TASKS {
        int id PK
        int list_id FK
        string title
        string description
        string status
        datetime due_date
        int priority
        datetime created_at
        datetime updated_at
    }
    REMINDERS {
        int id PK
        int task_id FK
        datetime reminder_time
        string type
        datetime created_at
    }

    USERS ||--o{ TODO_LISTS : "has"
    TODO_LISTS ||--o{ TASKS : "contains"
    TASKS ||--o{ REMINDERS : "has"
```

### Entity Description

| Entity | Meaning | Fields |
| :--- | :--- | :--- |
| **USERS** | Stores user account information. | `id`, `username`, `email`, `password_hash`, `created_at`, `updated_at` |
| **TODO_LISTS** | Represents a user's list for grouping tasks. | `id`, `user_id`, `title`, `created_at`, `updated_at` |
| **TASKS** | Represents a single todo item. | `id`, `list_id`, `title`, `description`, `status` (e.g., 'pending', 'completed'), `due_date`, `priority` |
| **REMINDERS** | Stores reminder settings for a task. | `id`, `task_id`, `reminder_time`, `type` (e.g., 'push', 'email') |

---

## 4. Functional Decomposition Diagram (WBS)

This diagram breaks down the TodoApp system into its main functional components.

```plantuml
@startwbs
<style>
.level1 {
  BackgroundColor #2E86C1
  FontColor #FFFFFF
}
.level2 {
  BackgroundColor #85C1E9
}
.level3 {
  BackgroundColor #D6EAF8
}
</style>

* TodoApp <<level1>>
** User Management <<level2>>
*** Registration <<level3>>
*** Login/Logout <<level3>>
*** Profile Management <<level3>>
** Todo List Management <<level2>>
*** Create List <<level3>>
*** View Lists <<level3>>
*** Edit List <<level3>>
*** Delete List <<level3>>
** Task Management <<level2>>
*** Create Task <<level3>>
*** View Tasks <<level3>>
*** Update Task \\n(status, priority, due date) <<level3>>
*** Delete Task <<level3>>
** Reminder & Notification Management <<level2>>
*** Set Reminder <<level3>>
*** Send Notifications \\n(Push & Email) <<level3>>
** Settings <<level2>>
*** Notification Preferences <<level3>>
*** Account Settings <<level3>>

@endwbs
```

### Function Description

| No | Function Name | Channel | Users | Description |
| :-- | :--- | :--- | :--- | :--- |
| 1 | **User Management** | Web, Mobile | User | Manages user accounts, including registration, authentication, and profile updates. |
| 1.1 | Registration | Web, Mobile | User | Allows a new user to create an account. |
| 1.2 | Login/Logout | Web, Mobile | User | Allows a user to sign in and out of the application. |
| 1.3 | Profile Management | Web, Mobile | User | Allows a user to update their personal information (e.g., password, username). |
| 2 | **Todo List Management** | Web, Mobile | User | Manages collections of tasks. |
| 2.1 | Create List | Web, Mobile | User | Allows a user to create a new todo list. |
| 2.2 | View Lists | Web, Mobile | User | Displays all todo lists belonging to the user. |
| 2.3 | Edit List | Web, Mobile | User | Allows a user to rename a todo list. |
| 2.4 | Delete List | Web, Mobile | User | Allows a user to delete a todo list and all its associated tasks. |
| 3 | **Task Management** | Web, Mobile | User | Manages individual todo items. |
| 3.1 | Create Task | Web, Mobile | User | Allows a user to add a new task to a list. |
| 3.2 | View Tasks | Web, Mobile | User | Displays tasks within a selected list. |
| 3.3 | Update Task | Web, Mobile | User | Allows a user to modify task details like status, priority, and due date. |
| 3.4 | Delete Task | Web, Mobile | User | Allows a user to delete a task. |
| 4 | **Reminder & Notification Mgt.**| Web, Mobile | User | Manages alerts for tasks. |
| 4.1 | Set Reminder | Web, Mobile | User | Allows a user to set a date and time for a reminder. |
| 4.2 | Send Notifications | System | User | The system automatically sends push and/or email notifications at the scheduled time. |
| 5 | **Settings** | Web, Mobile | User | Manages user preferences. |
| 5.1 | Notification Preferences | Web, Mobile | User | Allows a user to enable/disable different types of notifications. |
| 5.2 | Account Settings | Web, Mobile | User | Allows a user to manage their account (e.g., delete account). |

---

## 5. Activity Diagram: Create Task with Reminder

This diagram illustrates the process of a user creating a new task and scheduling a reminder for it.

```plantuml
@startuml
title Create Task with Reminder

|User|
start
:Access TodoApp;
:Select a Todo List;
:Click 'Add New Task';
:Enter Task Details
(Title, Due Date);

|System|
:Display 'Create Task' form;

|User|
:Choose to add a reminder;
:Set Reminder Time;
:Click 'Save Task';

|System|
if (Input data is valid?) then (yes)
  :Save Task to Database;
  :Save Reminder to Database;
  :Schedule notification job;
  :Display 'Success' message;
  stop
else (no)
  :Display 'Validation Error' message;
  |User|
  :Correct Task Details;
  :Click 'Save Task' again;
  |System|
  'This forms a loop back to the validation
  :Re-validate data;
  stop
endif

@enduml
```

### Process Steps

| Step | Actor | Description | Notes |
| :--- | :--- | :--- | :--- |
| 1 | User | Opens the application and navigates to the desired todo list. | Assumes the user is already logged in. |
| 2 | User | Clicks the button to add a new task. | |
| 3 | System | Presents the user with a form to enter task details. | |
| 4 | User | Fills in the task title, description, due date, etc. | |
| 5 | User | Activates the 'Add Reminder' option and selects a specific time for the reminder. | /' AI suggested '/ This step is optional. |
| 6 | User | Submits the form to create the task. | |
| 7 | System| Validates the submitted data (e.g., title is not empty, due date is in the future). | |
| 8a | System| If validation passes, saves the new task and its associated reminder to the database. | This is the happy path. |
| 8b | System| Schedules a job to send a notification at the specified reminder time. | Interacts with a notification service. |
| 8c | System| Displays a confirmation message to the user. | e.g., "Task created successfully!" |
| 9a | System| If validation fails, displays an error message indicating what needs to be corrected. | e.g., "Title cannot be empty." |
| 9b | User | The user corrects the input and re-submits the form. | The process returns to Step 7. |

---

## 6. Business Process Swimlane: Create Task with Reminder

This diagram shows the detailed interactions between components when a user creates a task with a reminder.

```plantuml
@startuml
title Create Task with Reminder

|User|
start
:Step 1: Click 'Add Task';

|TodoApp Frontend|
:Step 2: Display create task form;
:Step 3: User fills details
and clicks 'Save';
:Step 4: Send create task request;

|TodoApp Backend|
:Step 5: Validate task data;
if (Data is invalid?) then (yes)
  :Step 6a: Return error response;
  |TodoApp Frontend|
  :Step 6b: Display error message;
  stop
else (no)
  :Step 7: Save task to DB;
  |Database|
  :Step 8: Confirm task saved;
  |TodoApp Backend|
  :Step 9: Save reminder to DB;
  |Database|
  :Step 10: Confirm reminder saved;
  |TodoApp Backend|
  :Step 11: Schedule notification;
  |Notification Service|
  :Step 12: Confirm notification scheduled;
  |TodoApp Backend|
  :Step 13: Return success response;
  |TodoApp Frontend|
  :Step 14: Display success message;
  stop
endif

@enduml
```

### Process Steps

| Step | Actor | Action | Input | Output | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | User | Clicks the 'Add Task' button. | User click | - | Process starts. |
| 2 | TodoApp Frontend| Displays the form for creating a new task. | - | UI Form | |
| 3 | User | Fills in task details (title, due date) and reminder time, then clicks 'Save'. | Task data | - | ⭐ User can skip reminder. |
| 4 | TodoApp Frontend| Sends an API request to the backend with the task data. | Task data | API Request | |
| 5 | TodoApp Backend | Receives the request and validates the. | API Request | Validation Result | Checks for required fields, valid dates, etc. |
| 6a | TodoApp Backend | If validation fails, returns an error response. | Validation Result | API Error | e.g., `{ "error": "Title is required" }` |
| 6b | TodoApp Frontend| Displays the validation error message to the user. | API Error | UI Message | Flow ends until user corrects data. |
| 7 | TodoApp Backend | If validation succeeds, saves the new task record to the database. | Task Data | DB Query (INSERT) | |
| 8 | Database | Confirms that the task has been saved successfully. | - | DB Response | |
| 9 | TodoApp Backend | Saves the new reminder record to the database, linked to the task. | Reminder Data | DB Query (INSERT) | |
| 10 | Database | Confirms that the reminder has been saved successfully. | - | DB Response | |
| 11 | TodoApp Backend | Sends a request to the Notification Service to schedule the reminder. | Reminder details | API Request | |
| 12 | Notification Service| Confirms that the notification has been scheduled. | - | API Response | |
| 13 | TodoApp Backend | Returns a success response to the frontend. | - | API Success | e.g., `{ "status": "success" }` |
| 14 | TodoApp Frontend| Displays a success message to the user. | API Success | UI Message | e.g., "Task created!" |

---

## 7. Sequence Diagram: Create Task with Reminder

This diagram shows the sequence of interactions for creating a task with a reminder.

```mermaid
sequenceDiagram
    autonumber
    participant U as "User"
    participant A as "WebApp/MobileApp"
    participant API as "TodoApp API"
    participant DB as "Database"
    participant NS as "Notification Service"

    U->>A: Clicks 'Save Task'
    A->>API: POST /tasks (TaskData, ReminderTime)
    API->>API: Validate input data
    alt Input is Valid
        API->>DB: INSERT INTO TASKS (...)
        DB-->>API: Task created successfully
        API->>DB: INSERT INTO REMINDERS (...)
        DB-->>API: Reminder created successfully
        API->>NS: scheduleReminder(TaskID, ReminderTime)
        NS-->>API: Reminder scheduled successfully
        API-->>A: 201 Created (Success)
        A-->>U: Display 'Task Created' message
    else Input is Invalid
        API-->>A: 400 Bad Request (Error Details)
        A-->>U: Display validation error message
    end
```

### Interaction Steps

| Step | Description | Entity/DB/External | Notes |
| :--- | :--- | :--- | :--- |
| 1 | The user fills out the task form and clicks the save button. | User Action | |
| 2 | The frontend application sends a POST request to the `/tasks` endpoint of the API, including the task and reminder data in the payload. | API Request | |
| 3 | The API server receives the request and performs validation on the data (e.g., checks for required fields, data formats). | Internal Processing | BA suggested: Validation is crucial for data integrity. |
| 4 | If the data is valid, the API sends an `INSERT` statement to the database to create a new record in the `TASKS` table. | Database | |
| 5 | The database confirms that the task record has been created. | Database | |
| 6 | The API sends another `INSERT` statement to the database to create a new record in the `REMINDERS` table, linked to the new task. | Database | This step is skipped if no reminder was set. |
| 7 | The database confirms that the reminder record has been created. | Database | |
| 8 | The API sends a request to the external Notification Service to schedule the push notification or email to be sent at the specified reminder time. | Notification Service | |
| 9 | The Notification Service confirms that the reminder has been successfully scheduled. | Notification Service | |
| 10 | The API returns a `201 Created` status code to the frontend, indicating that the task was created successfully. | API Response | |
| 11 | The frontend displays a success message to the user. | UI Update | |
| 12 | If the input data is invalid (alternative flow), the API returns a `400 Bad Request` status with error details. The frontend then displays this error to the user. | API/UI | |

---

## 8. Business Process Flow Description: Create Task

This table provides a detailed, field-level description of the "Create Task with Reminder" process.

| Step | Actor | Description | Notes |
| :--- | :--- | :--- | :--- |
| 1-2 | User / WebApp | **Action**: User clicks 'Save' and the app sends a POST `/tasks` request. <br> **Data Sent**: `{ "list_id": 123, "title": "string", "description": "string", "due_date": "YYYY-MM-DD", "priority": 1, "reminder_time": "YYYY-MM-DD HH:MM:SS" }` | |
| 3 | TodoApp API | **Action**: Validate incoming data. <br> **Rules**: <br> - `title`: required, string, max 255 chars. <br> - `list_id`: required, exists in `TODO_LISTS`. <br> - `due_date`: optional, must be a valid date, cannot be in the past. <br> - `reminder_time`: optional, must be a valid datetime, must be before `due_date`. | AI suggested |
| 4-5 | TodoApp API | **Action**: Save task to database. <br> **SQL**: `INSERT INTO TASKS (list_id, title, ...) VALUES (...)` <br> **State Change**: A new record is created in the `TASKS` table with `status = 'pending'`. | |
| 6-7 | TodoApp API | **Action**: If `reminder_time` exists, save reminder to database. <br> **SQL**: `INSERT INTO REMINDERS (task_id, reminder_time, type) VALUES (...)` <br> **State Change**: A new record is created in the `REMINDERS` table. | AI suggested |
| 8-9 | TodoApp API | **Action**: Schedule the notification job. <br> **Request to Notification Service**: `{ "recipient": "user_device_token", "message": "Reminder: ...", "send_at": "..." }` | The recipient token is retrieved based on the user's session. |
| 10-11 | TodoApp API / WebApp | **Action**: Return success and display message. <br> **API Response**: `HTTP 201 Created` with the new task object. <br> **UI**: A toast/popup "Task created successfully" is shown. | |
| 12 | (Alt Flow) API / WebApp | **Action**: If validation fails, return error. <br> **API Response**: `HTTP 400 Bad Request` with `{"error": "due_date cannot be in the past"}`. <br> **UI**: The form field is highlighted with the error message. | |

---

## 9. State Diagram: Task Lifecycle

This diagram illustrates the different states a task can be in throughout its lifecycle.

```mermaid
stateDiagram-v2
    [*] --> Pending: CREATE
    Pending --> InProgress: START_PROGRESS
    Pending --> Completed: COMPLETE
    InProgress --> Completed: COMPLETE
    Pending --> Cancelled: CANCEL
    InProgress --> Cancelled: CANCEL
    Completed --> Pending: REOPEN
    Cancelled --> Pending: REOPEN
    Completed --> [*]
    Cancelled --> [*]
```

### State Transition Description

| From | Event | To |
| :--- | :--- | :--- |
| (Start) | CREATE | Pending |
| Pending | START_PROGRESS | InProgress |
| Pending | COMPLETE | Completed |
| InProgress | COMPLETE | Completed |
| Pending | CANCEL | Cancelled |
| InProgress | CANCEL | Cancelled |
| Completed | REOPEN | Pending |
| Cancelled | REOPEN | Pending |
| Completed | (End) | - |
| Cancelled | (End) | - |

---

## 10. State Diagram (PlantUML): Task Lifecycle

This diagram provides an alternative view of the task lifecycle using PlantUML.

```plantuml
@startuml
title Task State Lifecycle

state "Pending" as Pending
state "In Progress" as InProgress
state "Completed" as Completed
state "Cancelled" as Cancelled

[*] --> Pending : CREATE
Pending --> InProgress : START_PROGRESS
Pending --> Completed : COMPLETE
InProgress --> Completed : COMPLETE
Pending --> Cancelled : CANCEL
InProgress --> Cancelled : CANCEL

/' ⭐ AI addition: Allow reopening tasks '/
Completed --> Pending : REOPEN
Cancelled --> Pending : REOPEN

Completed --> [*]
Cancelled --> [*]

@enduml
```

### State Transition Details

| Entity | From | Event | Condition | Action | To |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Task | (Initial) | CREATE | - | Set `status` to 'Pending' | Pending |
| Task | Pending | START_PROGRESS | - | Set `status` to 'In Progress' | InProgress |
| Task | Pending | COMPLETE | - | Set `status` to 'Completed' | Completed |
| Task | InProgress | COMPLETE | - | Set `status` to 'Completed' | Completed |
| Task | Pending | CANCEL | - | Set `status` to 'Cancelled' | Cancelled |
| Task | InProgress | CANCEL | - | Set `status` to 'Cancelled' | Cancelled |
| Task | Completed | REOPEN | User is owner | Set `status` to 'Pending' | Pending |
| Task | Cancelled | REOPEN | User is owner | Set `status` to 'Pending' | Pending |

---

## 11. UI Specification: Create Task Screen

This section specifies the UI components and validation rules for the "Create Task" screen.

| No | Purpose & Data | UI Component | Validation & Error Message |
| :-- | :--- | :--- | :--- |
| 1 | Screen Title | Label | **Content**: "New Task" or "Edit Task". |
| 2 | Task Title | Text Input | **Validation**: Required, Maxlength: 255. <br> **Error (ERR01)**: "Title is required." <br> **Error (ERR02)**: "Title cannot exceed 255 characters." |
| 3 | Task Description | Text Area | **Validation**: Optional, Maxlength: 1000. <br> **Error (ERR03)**: "Description cannot exceed 1000 characters." |
| 4 | Due Date | Date Picker | **Validation**: Optional. Must not be in the past. <br> **Error (ERR04)**: "Due date cannot be in the past." |
| 5 | Priority | Segmented Control | **Options**: Low, Medium, High. <br> **Default**: Medium. |
| 6 | Add Reminder | Switch / Toggle | **Default**: Off. Toggles visibility of the Reminder Time picker. |
| 7 | ⭐ Reminder Time | DateTime Picker | **Validation**: Required if "Add Reminder" is On. Must be before the Due Date. <br> **Error (ERR05)**: "Reminder time must be before the due date." <br> **Error (ERR06)**: "A reminder time is required."|
| 8 | Save Button | Button | **Action**: On click, validates the form. If valid, sends data to the API. If invalid, displays errors. <br> **State**: Disabled until the 'Title' field is filled. |
| 9 | ⭐ Cancel Button | Button / Icon | **Action**: Discards changes and navigates back to the previous screen. Shows a confirmation dialog if form has data. |

### Error Code Reference

| Error Code | Message |
| :--- | :--- |
| ERR01 | The <field> is required. |
| ERR02 | The <field> cannot exceed <maxlength> characters. |
| ERR03 | The <field> cannot exceed <maxlength> characters. |
| ERR04 | The due date cannot be in the past. |
| ERR05 | The reminder time must be earlier than the due date. |
| ERR06 | The reminder time is required when reminders are enabled. |

---

## 12. User Acceptance Test (UAT) Cases: Create Task

This section provides UAT cases for the "Create Task" functionality.

| Test Case ID | Scenario Description | Precondition | Test Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **Happy Path** |
| CT-001 | Create a full task with all details | User is logged in and is on the 'Todo List' screen. | 1. Tap 'Add Task'. <br> 2. Enter a valid Title. <br> 3. Enter a Description. <br> 4. Select a future Due Date. <br> 5. Select a Priority. <br> 6. Enable 'Add Reminder' and select a valid time. <br> 7. Tap 'Save'. | 1. A success message "Task created" appears. <br> 2. The new task is visible in the todo list with all its details. |
| CT-002 | Create a simple task with only the required field | User is logged in and is on the 'Todo List' screen. | 1. Tap 'Add Task'. <br> 2. Enter a valid Title. <br> 3. Tap 'Save'. | 1. A success message "Task created" appears. <br> 2. The new task is visible in the list with default values for other fields (e.g., no due date, medium priority). |
| **Negative Path** |
| CT-003 | Attempt to save a task with a blank title | User is on the 'Create Task' screen. | 1. Leave the Title field blank. <br> 2. Tap 'Save'. | 1. An error message "Title is required" (ERR01) is displayed next to the title field. <br> 2. The task is not saved. |
| CT-004 | Attempt to save a task with a past due date | User is on the 'Create Task' screen. | 1. Enter a valid Title. <br> 2. Select a Due Date from the past. <br> 3. Tap 'Save'. | 1. An error message "Due date cannot be in the past" (ERR04) is displayed. <br> 2. The task is not saved. |
| CT-005 | Attempt to save a reminder time that is after the due date | User is on the 'Create Task' screen. | 1. Enter a valid Title. <br> 2. Select a future Due Date (e.g., Tomorrow at 10:00 AM). <br> 3. Enable 'Add Reminder'. <br> 4. Select a Reminder Time that is after the due date (e.g., Tomorrow at 11:00 AM). <br> 5. Tap 'Save'. | 1. An error message "Reminder time must be before the due date" (ERR05) is displayed. <br> 2. The task is not saved. |
| **Boundary Path** |
| CT-006 | ⭐ Create a task with the maximum title length | User is on the 'Create Task' screen. | 1. Enter a Title with exactly 255 characters. <br> 2. Tap 'Save'. | 1. The task is saved successfully. <br> 2. The full title is displayed correctly (it may be truncated with "..." in the list view but fully visible in the detail view). |
| CT-007 | Create a task with a due date of today | User is on the 'Create Task' screen. | 1. Enter a valid Title. <br> 2. Select today's date as the Due Date. <br> 3. Tap 'Save'. | 1. The task is saved successfully. <br> 2. The due date is displayed as "Today". |