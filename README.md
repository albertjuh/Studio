# Nutshell Insights - Cashew Factory Management App

Nutshell Insights is a comprehensive, web-based factory management application designed specifically for a cashew processing plant. It provides tools for real-time data entry, inventory tracking, operational monitoring, and AI-powered reporting to enhance decision-making and efficiency.

## Core Purpose

The primary goal of this application is to digitize and streamline the entire production workflow of a cashew factory. It replaces manual record-keeping with an intuitive digital interface, providing managers and workers with accurate, real-time data and actionable insights.

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI**: [React](https://reactjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (as the backend data store)
- **Generative AI**: [Google AI & Genkit](https://firebase.google.com/docs/genkit)
- **State Management**: [TanStack Query (React Query)](https://tanstack.com/query/latest) for server state management.

## Key Features & Functionality

### 1. Role-Based Access Control
The application supports two user roles with distinct permissions:
- **Admin**: Has full access to all features, including the dashboard, all data entry forms, reports, AI summaries, and configuration settings.
- **Worker**: Has restricted access, primarily focused on the Data Entry page to log production activities.

### 2. Dashboard (`/dashboard`)
This is the central hub for factory managers (admins). It provides a real-time snapshot of the factory's health through several key metrics:
- **RCN Stock**: Current level of Raw Cashew Nuts, with an indicator of how many days of production it can support.
- **Packaging Materials**: Stock levels for essential items like vacuum bags and boxes.
- **Operational Alerts**: A count of critical issues (e.g., low stock). Clicking this card opens a dialog with a detailed list of all active alerts.
- **AI Daily Summary**: A section where managers can generate a concise, AI-powered summary of the day's activities and get actionable insights.

### 3. Data Entry (`/data-entry`)
This is the primary interface for logging all factory operations. A dropdown menu allows users to select from a variety of specific forms, each tailored to a particular stage of the production process. The forms are ordered to match the logical flow of production:

- **Inventory**: RCN Intake, Other Materials Intake, Goods Dispatched.
- **Maintenance**: Equipment Calibration.
- **Quality Control**: RCN Quality Assessment, Final Product QC.
- **Production Stages**: Steaming, Shelling, Drying, Peeling, Grading, Manual Refinement, Packaging.

Each form includes input validation and provides immediate feedback upon submission.

### 4. Inventory Logs (`/inventory`)
This page provides a transparent view of all material movements.
- **Recent Intake**: Two tabs display logs for incoming Raw Cashew Nuts and other materials (e.g., packaging, spare parts).
- **Recent Dispatch**: A single table shows all items leaving the factory, including finished products, waste, and samples.

### 5. Reports (`/reports`)
Users can generate data-driven reports by selecting a date range. The generated report includes:
- **Totals**: High-level summaries of goods received, dispatched, and produced.
- **Item-wise Summary**: A breakdown of movement for each inventory item.
- **Production Logs**: A detailed, chronological list of all activities logged within the selected period.
- **AI Report Summary**: An on-demand feature to generate an AI-powered summary of the currently displayed report data.

### 6. AI Summaries Page (`/ai-summary`)
A dedicated page for admins to view and generate AI summaries for any specific date. It allows for historical analysis and review of past operational highlights.

### 7. Notifications (`/notifications`)
Admins can configure email notifications. This includes enabling/disabling daily AI summary emails and setting the recipient's email address.

## Project Structure Overview

- **`src/app/(app)`**: Contains the core application pages that are protected by the main layout (`layout.tsx`), which handles authentication and role-based access.
- **`src/app/(auth)`**: Contains public-facing pages like the login screen.
- **`src/components`**: Reusable React components, organized by feature (e.g., `dashboard`, `data-entry`) and UI elements (`ui`).
- **`src/lib`**: Core application logic.
  - **`actions.ts`**: Server Actions that are called from client components to interact with the server (e.g., save form data, generate AI summaries).
  - **`constants.ts`**: Application-wide constants, such as navigation items (`NAV_ITEMS`) and dropdown options for forms.
  - **`database-service.ts`**: A singleton class that encapsulates all Firestore database interactions. This is the single source of truth for database queries.
  - **`inventory-actions.ts`**: Server Actions specifically for fetching inventory and dashboard data.
  - **`firebase/`**: Configuration files for both client-side (`client.ts`) and server-side (`admin.ts`) Firebase SDKs.
- **`src/ai`**: All Genkit (Generative AI) related code.
  - **`flows/`**: Contains the definitions for AI flows, which are callable functions that interact with the Large Language Model (LLM). Each flow defines its input/output schema (using Zod) and the prompt.
- **`src/types`**: TypeScript type definitions and interfaces used across the application.
