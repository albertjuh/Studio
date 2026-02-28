import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export function exportRecruitmentToExcel(entries: any[]) {
  const wb = XLSX.utils.book_new();

  const rawData = entries.map(e => ({
    'Date': e.date,
    'Facility': e.facility,
    'RA': e.ra_name,
    'Total ANC': e.total_anc,
    'Eligible': e.eligible,
    'Interviewed': e.interviewed,
    'Missed': e.missed,
    'Women (this reason)': e.num_women,
    'Reason': e.reason,
    'Notes': e.notes,
    'First Row Flag': e.first_row_flag,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawData), 'Raw Data');

  const raNames = [...new Set(entries.map((e: any) => e.ra_name))] as string[];
  const raSummary = raNames.map(ra => {
    const raEntries = entries.filter(e => e.ra_name === ra);
    const firstRows = raEntries.filter(e => e.first_row_flag === 1);
    const eligible = firstRows.reduce((s: number, e: any) => s + (e.eligible || 0), 0);
    const interviewed = firstRows.reduce((s: number, e: any) => s + (e.interviewed || 0), 0);
    const missed = raEntries.reduce((s: number, e: any) => s + (e.num_women || 0), 0);
    return {
      'RA Name': ra,
      'Total ANC': firstRows.reduce((s: number, e: any) => s + (e.total_anc || 0), 0),
      'Eligible': eligible,
      'Interviewed': interviewed,
      'Missed': missed,
      'Rate': eligible > 0 ? ((interviewed / eligible) * 100).toFixed(1) + '%' : '0%',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(raSummary), 'By RA');

  const REASONS = [
    'Did not consent', 'Finance issue', 'Partner did not consent',
    'Disappeared/Left before completion', 'RA was with another woman',
    'Working hours done - sent away', 'Language barrier', 'Too sick/unwell',
    'Not eligible', 'Does not live in Temeke Municipality',
    'Will not deliver in Temeke Municipality', 'Cognitive impairment',
    'Had a baby with known lethal fetal anomaly', 'Other',
  ];
  const totalMissed = entries.reduce((s: number, e: any) => s + (e.num_women || 0), 0);
  const reasonData = REASONS.map(reason => {
    const count = entries
      .filter(e => e.reason === reason)
      .reduce((s: number, e: any) => s + (e.num_women || 0), 0);
    return {
      'Reason': reason,
      'Count': count,
      'Percentage': totalMissed > 0 ? ((count / totalMissed) * 100).toFixed(1) + '%' : '0%',
    };
  }).sort((a, b) => b.Count - a.Count);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reasonData), 'Attrition Reasons');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buf], { type: 'application/octet-stream' }),
    `PartoMa_Recruitment_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  );
}

export function exportParticipantsToExcel(participants: any[]) {
  const wb = XLSX.utils.book_new();
  const data = participants.map(p => ({
    'Participant ID': p.participant_id,
    'Enrollment Date': p.enrollment_date,
    'Facility': p.facility,
    'RA': p.ra_name,
    'GA at Enrollment (wks)': p.ga_weeks_at_enrollment,
    'EDD': p.edd,
    'Current GA (wks)': p.current_ga_weeks,
    'Trimester': p.current_trimester,
    'Delivery Status': p.delivery_status,
    'Overall Status': p.overall_status,
    'Survey 1': p.survey1_completed ? 'Done' : 'Pending',
    'Survey 2': p.survey2_completed ? 'Done' : 'Pending',
    'Survey 3': p.survey3_completed ? 'Done' : 'Pending',
    'Survey 4': p.survey4_completed ? 'Done' : 'Pending',
    'Notes': p.notes,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Participants');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buf], { type: 'application/octet-stream' }),
    `PartoMa_Participants_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
  );
}
