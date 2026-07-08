/** A deliberately messy sample (multi-phone cells, multiple emails, day-first
 * dates, junk contacts) so users can see the AI mapping and the skip rule in
 * action without hunting for a test file. A trimmed variant of
 * samples/messy-sales-report.csv at the repo root. */
export const SAMPLE_CSV_FILENAME = "groweasy-sample-leads.csv";

export const SAMPLE_CSV_CONTENT = `S.No,Client,Ph No,Mail,Location,Deal Status,Src,Followup Dt,Notes
1,John Doe,9876543210 / 9123456789,john.doe@example.com,"Mumbai, Maharashtra",interested,eden park,25/12/2026,"Asked to reschedule demo"
2,Sarah J.,+919876543211,sarah.j@example.com; sarah.personal@gmail.com,"Bangalore, Karnataka",busy will try later,,13/05/2026,"Person was busy"
3,Startup Inc (Rajesh),98765-43212,rajesh AT startup DOT in,"Delhi NCR",junk,,,"Wrong number given"
4,Priya Singh,,priya.singh@example.com,"Pune, Maharashtra",deal closed,SARJAPUR_PLOTS,2026-05-13 14:35:22,"Onboarding in progress"
5,Mystery Lead,N/A,,"Chennai",interested,,,No usable contact details
6,Amit K,+91 99887 76655,amit.k@corp.co.in,"Hyderabad, Telangana",no answer,leads on demand,30-06-2026,"Left voicemail"
`;

export function downloadSampleCsv(): void {
  const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = SAMPLE_CSV_FILENAME;
  a.click();
  URL.revokeObjectURL(url);
}
