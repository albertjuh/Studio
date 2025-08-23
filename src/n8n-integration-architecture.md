# N8n Integration Architecture for Nutshell Insights

This document outlines an architectural proposal to enhance the reliability and debuggability of the application's data processing by integrating [n8n.io](https://n8n.io/), an extendable workflow automation tool.

## Problem Statement

Currently, the Next.js server actions are responsible for handling complex, multi-step database operations. For example, saving a single "Packaging" form submission requires:
1.  Creating a primary log in the `production_logs` collection.
2.  Finding and decrementing the stock of `Peeled Kernels`.
3.  Finding and decrementing the stock of the correct `Vacuum Bag Carton`.
4.  Finding and decrementing the stock of the correct `Packaging Box`.
5.  Creating a new `Finished Goods` inventory item.
6.  Creating multiple entries in the `inventory_logs` collection for auditing.

Performing all these steps atomically within a single serverless function can be fragile. A failure at any step can lead to inconsistent data and is difficult to debug from application logs alone.

## Proposed Solution: Decoupling with N8n

We will delegate these complex workflows to n8n, which is purpose-built for such tasks.

### New Data Flow

1.  **Form Submission:** The user submits a form in the Next.js application.
2.  **Webhook Trigger:** The Next.js server action's only responsibility is to collect the raw form data and send it as a secure POST request to a dedicated n8n webhook URL. It then immediately returns a success response to the user, making the UI feel fast.
3.  **N8n Workflow Execution:** An n8n workflow is triggered by this webhook. The workflow performs all the database operations as a sequence of distinct, manageable nodes:
    *   **Start Node:** Receives the webhook data.
    *   **Firestore Node (Create Log):** Connects to Firestore and creates the main `production_log` document.
    *   **Firestore Node (Update Inventory):** Sequentially finds and updates each related inventory item (e.g., deducting raw materials, adding finished goods). Each of these can be a separate node.
    *   **Firestore Node (Create Audit Logs):** Creates the necessary entries in the `inventory_logs` collection.
    *   **SendGrid/Email Node (Optional):** Sends a confirmation or error notification to the factory manager.
    *   **Error Handling:** n8n has built-in error handling. Failed executions can be inspected, and workflows can be configured to retry automatically.

![N8n Workflow Diagram](https://placehold.co/800x300.png?text=Form+Submission+->+Webhook+->+N8N+Workflow)

### Advantages of this Architecture

*   **Reliability:** N8n's workflow engine is designed for long-running, multi-step processes with built-in support for retries and error handling.
*   **Visibility & Debugging:** Every single execution is logged in the n8n canvas. If a transaction fails, you can see exactly which node failed and inspect the data that caused the issue, making debugging trivial compared to searching through serverless function logs.
*   **Scalability:** Complex logic can be built and modified visually in n8n without requiring a full application redeployment.
*   **Decoupling:** The Next.js application remains lean and focused on the user experience, while the heavy data processing is offloaded to a specialized tool.

### Required Setup

1.  **N8n Instance:** A self-hosted or n8n cloud instance.
2.  **Webhook Workflow:** Create a new workflow in n8n with a "Webhook" trigger node. This will provide a URL to be added to the Next.js environment variables.
3.  **Firestore Credentials for N8n:** Provide n8n with the Firebase service account credentials to allow it to communicate with the database.
4.  **Update Server Actions:** Modify the existing server actions in `src/lib/actions.ts` to call the n8n webhook instead of performing the database logic directly.

This approach provides a professional, enterprise-grade solution to the data consistency problems we have faced.
