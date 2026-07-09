# Deliverables: Clinic Medical Records & Inventory System

## 1. Deliverables Overview

This document lists the expected project deliverables for the Clinic Medical Records & Inventory System based on the approved quotation scope.

The system deliverables are grouped according to the three development phases:

1. Phase 1 - UI/UX, workflow, forms, and database foundation.
2. Phase 2 - Backend logic, data relationships, records, and inventory processing.
3. Phase 3 - Testing, deployment, revisions, documentation, turnover, and onboarding.

---

## 2. Phase 1 Deliverables

## 2.1 UI/UX Layout and Workflow Implementation

### Deliverables

- Main application layout.
- Login screen.
- Dashboard layout.
- Sidebar or main navigation.
- Responsive page structure.
- Clinic workflow screens.
- Patient registration screen.
- Patient profile screen.
- Patient chart screen.
- Consultation record screen layout.
- Today's queue screen layout.
- Follow-up monitoring screen layout.
- Vaccination tracking screen layout.
- Medical history screen layout.
- Vital signs and assessment screen layout.
- Inventory screen layout.
- Medicine request screen layout.

### Acceptance Criteria

- User can navigate through the main modules.
- Layout is clean, usable, and mobile-friendly.
- Screens follow the clinic's expected workflow.
- No major layout breakage on common desktop and mobile screen sizes.
- UI is ready for backend integration.

---

## 2.2 Forms and Printable Template Drafts

### Deliverables

- Draft medical certificate template.
- Draft referral form template.
- Draft printable patient form template.
- Printable layout preview pages.
- Fields mapped to expected patient and consultation data.

### Acceptance Criteria

- Templates contain the required basic fields.
- Templates are printable or export-ready.
- Format can be refined based on client feedback.
- Layout direction is aligned with the clinic's approved format.

---

## 2.3 Database Structure Preparation

### Deliverables

- Initial PostgreSQL database schema.
- Prisma schema file.
- Core database tables/entities.
- Initial migrations.
- Basic seed data if needed.

### Suggested Core Entities

- Users.
- Roles.
- Patients.
- Patient profiles.
- Consultations.
- Patient charts.
- Medical histories.
- Vital signs.
- Assessments.
- Queue entries.
- Follow-ups.
- Vaccination records.
- Printable documents.
- Medicines.
- Medicine stock movements.
- Medicine requests.
- Activity logs.

### Acceptance Criteria

- Database schema supports the agreed core modules.
- Relationships are clearly defined.
- Schema is ready for backend implementation.
- Sensitive data structure is considered during design.

---

## 2.4 Phase 1 Milestone Package

### Deliverables

- UI/UX milestone build.
- Database schema draft.
- Printable template drafts.
- List of pending client decisions or confirmations.

### Acceptance Criteria

- Phase 1 can be reviewed by the client.
- Client can provide feedback on layout, workflow, and forms.
- Phase 1 approval allows backend development to continue.

---

## 3. Phase 2 Deliverables

## 3.1 Authentication and User Access

### Deliverables

- Secure login system.
- Password-protected accounts.
- Role-based access control.
- Protected routes/pages.
- Controlled access to sensitive functions.

### Acceptance Criteria

- Users can log in securely.
- Users only see and access functions allowed by their role.
- Sensitive functions are not accessible to unauthorized users.

---

## 3.2 Core Clinic Module

### Deliverables

- Dashboard and clinic activity overview.
- Patient registration function.
- Patient profile management function.
- Patient chart records function.
- Consultation records function.
- Today's patient queue function.
- Follow-up monitoring function.
- Vaccination tracking function.
- Medical history records function.
- Vital signs and assessment logging function.

### Acceptance Criteria

- Users can create and update patient records based on permissions.
- Users can create and view consultation records.
- Users can manage queue entries for the current day.
- Users can record follow-ups, vaccination records, medical history, vital signs, and assessment information.
- Records are connected to the correct patient profile.
- Data validation prevents incomplete or invalid critical entries where applicable.

---

## 3.3 Medical Documentation Module

### Deliverables

- Medical certificate generation.
- Referral form generation.
- Printable patient forms.
- Layout refinement workflow for approved formats.

### Acceptance Criteria

- Users can generate agreed printable documents.
- Printable documents pull correct patient and consultation data where applicable.
- Document format can be refined until the approved format is achieved.
- Generated forms are suitable for clinic use after approval.

---

## 3.4 Inventory Module

### Deliverables

- Medicine inventory management.
- Stock monitoring.
- Medicine request tracking.
- Low stock alerts.

### Acceptance Criteria

- Users can add and update medicine records based on permissions.
- Users can monitor current stock levels.
- Users can record medicine requests.
- Low stock items are visibly flagged.
- Inventory records are logically organized and searchable/filterable where applicable.

---

## 3.5 Data Relationships and Processing

### Deliverables

- Backend logic for all agreed modules.
- Data relationships between patient, consultation, queue, follow-up, vaccination, medical history, vital signs, assessment, documents, medicine inventory, and medicine requests.
- Server-side validation.
- Error handling.

### Acceptance Criteria

- Records are saved to the correct tables.
- Related records can be retrieved from the correct patient or module page.
- System prevents obvious invalid actions.
- Core workflows can be completed from start to finish.

---

## 3.6 Activity Logging and Controlled Access

### Deliverables

- Activity logging for important system actions.
- Controlled access to sensitive functions.
- Basic audit trail views for authorized users.

### Acceptance Criteria

- Important actions are logged.
- Logs contain useful details such as user, action, date/time, and affected record where applicable.
- Only authorized users can access logs or sensitive functions.

---

## 3.7 Phase 2 Milestone Package

### Deliverables

- Functional core clinic module.
- Functional documentation module.
- Functional inventory module.
- Authentication and role-based access.
- Activity logging and validation.
- Mid-development review build.

### Acceptance Criteria

- Main system workflows are functional.
- Client can test records, documentation, and inventory processes.
- Phase 2 approval allows final testing and deployment preparation.

---

## 4. Phase 3 Deliverables

## 4.1 Testing

### Deliverables

- Functional testing of agreed modules.
- Role and permission testing.
- Form and print testing.
- Responsive layout testing.
- Data validation testing.
- LAN access testing.
- Backup/recovery setup testing.

### Acceptance Criteria

- Core modules are accessible and usable.
- User roles behave as expected.
- Printable documents display in the approved format.
- System is usable on common device sizes.
- LAN deployment is confirmed working in the client environment.
- Known issues are documented and addressed according to agreed priority.

---

## 4.2 Deployment

### Deliverables

- LAN-ready deployment of the system.
- Application setup on client-provided server hardware.
- Database setup.
- Environment configuration.
- Local network access configuration.
- Backup and recovery mechanism setup.

### Acceptance Criteria

- Authorized clinic users can access the application within the local network.
- Database is connected and operational.
- Core modules work in the deployed environment.
- Backup/recovery mechanism is configured.
- Deployment limitations caused by client hardware or network conditions are documented if any.

---

## 4.3 Revisions and Workflow Adjustments

### Deliverables

- 2 to 3 minor revision cycles for cosmetic refinements.
- Approved layout adjustments.
- Approved printable format refinements.
- Minor workflow clarifications within agreed scope.

### Acceptance Criteria

- Minor cosmetic issues raised during review are addressed.
- Approved forms match the expected format.
- No unresolved critical issue prevents use of core modules.

### Not Included as Minor Revisions

The following are change-order items and are not included as minor revisions:

- New modules.
- Major workflow redesigns.
- Database restructuring.
- New functionality outside agreed scope.
- Historical data migration.
- Bulk encoding.
- Manual data entry services.

---

## 4.4 Documentation and User Guides

### Deliverables

- User guide for clinic staff.
- Admin guide for user/role management if applicable.
- Basic deployment notes.
- Backup/recovery procedure notes.
- Turnover notes.

### Acceptance Criteria

- Users have a reference guide for common tasks.
- Admin users have basic instructions for account and access management.
- Deployment and backup details are documented for the client.

---

## 4.5 Turnover Package

### Deliverables

- Deployed system.
- Final database schema/migrations.
- Final source code package or repository access, subject to full payment and agreed turnover process.
- Documentation and user guides.
- Initial admin account or account setup procedure.
- Backup/recovery notes.
- Known limitations or post-deployment notes.

### Acceptance Criteria

- Client can access and use the deployed system.
- Client receives the agreed operational deliverables.
- Client confirms review of agreed system functionality.
- Final payment milestone becomes due upon deployment and turnover based on the quotation.

---

## 5. Post-Deployment Support Deliverables

## 5.1 Four-Week Onboarding Support

### Deliverables

- Four weeks of onboarding support after deployment.
- Stabilization assistance.
- Minor fixes.
- User orientation support.

### Acceptance Criteria

- Client receives support for stabilization and onboarding within the included support period.
- Minor issues are addressed based on priority and availability.
- Major enhancements are identified separately for quotation if needed.

---

## 5.2 Maintenance Beyond Four Weeks

### Included Priority Support

- System-breaking bugs that prevent access to core modules receive priority support depending on availability and project workload.

### Subject to Standard Service Fees

- Issues caused by user error.
- Hardware failure.
- Network outages.
- Power interruptions.
- Unauthorized device access.
- Requests beyond the agreed scope.
- Major enhancements.

---

## 6. Cost-related Deliverables

Total project cost: **PHP 70,000**

| Cost Item | Amount |
|---|---:|
| System UI/UX & Frontend Development | PHP 16,000 |
| Clinic Records Module | PHP 15,000 |
| Inventory Module | PHP 12,000 |
| Forms & Printable Documents | PHP 5,000 |
| Database & System Structure | PHP 10,000 |
| Testing & Deployment | PHP 4,000 |
| Documentation & User Guides | PHP 4,000 |
| Initial Support & 4-week Onboarding | PHP 4,000 |
| **Total Project Cost** | **PHP 70,000** |

Optional expedited timeline: **Deployment within 1 month + PHP 10,000**

---

## 7. Payment-linked Deliverables

## 7.1 30% Project Start / Downpayment

### Expected Output After Start

- Project kickoff.
- Workflow confirmation.
- Initial UI/UX direction.
- Initial database planning.
- Initial form/template planning.

### Note

The project start downpayment is non-refundable according to the quotation terms.

---

## 7.2 40% Mid-development Milestone

### Covered Scope

- Phase 1 and Phase 2 milestone deliverables.
- UI/UX layout.
- Database structure.
- Backend logic.
- Clinic records module progress.
- Inventory module progress.
- Documentation module progress.

### Acceptance Trigger

If the client does not provide feedback or written approval within seven working days after milestone submission, the milestone may be deemed accepted and payment becomes due based on the quotation terms.

---

## 7.3 30% Deployment and Turnover

### Covered Scope

- Final testing.
- LAN deployment.
- Revisions and workflow adjustments within agreed scope.
- Documentation.
- User guides.
- Turnover.
- Start of 4-week onboarding support.

---

## 8. Excluded Deliverables

The following are not included unless separately agreed:

- Bulk encoding.
- Historical record migration.
- Manual data entry.
- Additional modules.
- Workflow redesigns beyond agreed scope.
- Database restructuring caused by new requirements.
- Hardware procurement.
- Full local network setup outside application deployment.
- Major enhancements after deployment.
- Support for issues caused by hardware failure, local network problems, unauthorized access, user negligence, power interruption, or external factors outside application-level control.

---

## 9. Client-side Requirements

The client must provide or confirm:

- Local server hardware for LAN deployment.
- Local network environment.
- Devices that will access the system.
- Approved workflow details.
- Approved form and printable document formats.
- Timely milestone feedback and approvals.
- Backup storage location or storage policy.
- Authorized users and role assignments.

---

## 10. Final Acceptance Checklist

The project may be considered ready for turnover when the following are complete:

- [ ] Dashboard and clinic activity overview is working.
- [ ] Patient registration is working.
- [ ] Patient profile management is working.
- [ ] Patient chart and consultation records are working.
- [ ] Today's patient queue is working.
- [ ] Follow-up monitoring is working.
- [ ] Vaccination tracking is working.
- [ ] Medical history records are working.
- [ ] Vital signs and assessment logging is working.
- [ ] Medical certificate generation is working.
- [ ] Referral forms are working.
- [ ] Printable patient forms are available.
- [ ] Medicine inventory is working.
- [ ] Stock monitoring is working.
- [ ] Medicine request tracking is working.
- [ ] Low stock alerts are working.
- [ ] Secure login is implemented.
- [ ] Role-based access control is implemented.
- [ ] Activity logging is implemented.
- [ ] Data validation is implemented.
- [ ] Sensitive functions are controlled by permissions.
- [ ] Backup and recovery mechanism is set up.
- [ ] LAN deployment is working.
- [ ] Documentation and user guides are delivered.
- [ ] Initial support and onboarding period is ready to begin.
- [ ] Client has reviewed and confirmed the agreed system functionality.

---

## 11. Notes for Development Tracking

Recommended project tracker columns:

- Module.
- Feature.
- Phase.
- Status.
- Priority.
- Assigned To.
- Client Confirmation Needed.
- Date Submitted.
- Date Approved.
- Notes.

Suggested statuses:

- Not Started.
- In Progress.
- For Internal Testing.
- For Client Review.
- Revision Needed.
- Approved.
- Deployed.
- Deferred / Change Order.

---

## 12. Change Order Indicators

Flag a request as a possible change order when it involves:

- A new module.
- New business process not included in the quotation.
- Major redesign of approved workflow.
- New reports not part of the agreed scope.
- Historical data migration.
- Bulk encoding.
- New external integrations.
- Major database structure changes.
- Deployment outside the agreed LAN setup.
- Online/cloud access request after LAN deployment.

---

## 13. Summary of Final Deliverables

At minimum, the final project delivery should include:

1. LAN-ready clinic management system.
2. Core clinic records module.
3. Medical documentation module.
4. Inventory module.
5. Secure authentication and role-based access.
6. Activity logging and controlled access to sensitive functions.
7. Backup and recovery mechanism setup.
8. Approved printable forms.
9. Documentation and user guides.
10. Deployment and turnover.
11. Four-week onboarding support.
