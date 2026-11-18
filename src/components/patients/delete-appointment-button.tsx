"use client";
import { RecordAction } from "@/components/admin/record-action";
export function DeleteAppointmentButton({patientId,visitId}:{patientId:string;visitId:string}) { return <RecordAction kind="Visit" recordId={visitId} label="Appointment" summary="This appointment and its linked records will be hidden from normal views. Its original status and history are retained for recovery." returnTo={`/patients/${patientId}`} />; }
