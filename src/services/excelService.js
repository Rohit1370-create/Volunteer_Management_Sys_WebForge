const ExcelJS = require('exceljs');

/**
 * Generate an Excel workbook (.xlsx) containing volunteer list for an opportunity
 * Fields: Name, Email, Phone, Branch, Section, Year, Registration Timestamp
 */
const generateVolunteersExcel = async (opportunity, registrations) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Volunteer Management System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Registered Volunteers');

  // Title section
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `Volunteers for Opportunity: ${opportunity.title}`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 30;

  // Metadata row
  worksheet.mergeCells('A2:G2');
  const metaCell = worksheet.getCell('A2');
  metaCell.value = `Date: ${new Date(opportunity.dateTime).toLocaleString()} | Venue: ${opportunity.location} | Capacity: ${opportunity.registeredCount}/${opportunity.requiredVolunteers}`;
  metaCell.font = { name: 'Arial', size: 10, italic: true };
  metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(2).height = 20;

  // Column definitions
  worksheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Branch', key: 'branch', width: 15 },
    { header: 'Section', key: 'section', width: 12 },
    { header: 'Year of Study', key: 'yearOfStudy', width: 15 },
    { header: 'Registration Timestamp', key: 'registeredAt', width: 28 }
  ];

  // Header row styling
  worksheet.getRow(3).values = [
    'Name',
    'Email',
    'Phone',
    'Branch',
    'Section',
    'Year of Study',
    'Registration Timestamp'
  ];
  const headerRow = worksheet.getRow(3);
  headerRow.height = 24;
  headerRow.eachCell(cell => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Populate data rows
  registrations.forEach(reg => {
    const user = reg.user || {};
    worksheet.addRow({
      name: user.name || 'N/A',
      email: user.email || 'N/A',
      phone: user.phone || 'N/A',
      branch: user.branch || 'N/A',
      section: user.section || 'N/A',
      yearOfStudy: user.yearOfStudy ? `Year ${user.yearOfStudy}` : 'N/A',
      registeredAt: reg.registeredAt ? new Date(reg.registeredAt).toISOString() : 'N/A'
    });
  });

  // Style data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 3) {
      row.height = 20;
      row.eachCell(cell => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      });
    }
  });

  return await workbook.xlsx.writeBuffer();
};

module.exports = {
  generateVolunteersExcel
};
