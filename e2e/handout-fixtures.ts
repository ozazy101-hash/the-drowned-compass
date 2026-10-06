export const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGP4XxGAFTEMLQkAnhxxwZ2rsCsAAAAASUVORK5CYII=', 'base64');
export function pdfFixture() {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 5 0 R >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 6 0 R >>','<< /Length 25 >>\nstream\n0 0 1 rg 10 10 80 80 re f\nendstream','<< /Length 25 >>\nstream\n1 0 0 rg 10 10 80 80 re f\nendstream'];
  let source='%PDF-1.7\n'; const positions = [0];
  objects.forEach((body,index) => { positions.push(Buffer.byteLength(source)); source+=`${index+1} 0 obj\n${body}\nendobj\n`; });
  const offset=Buffer.byteLength(source); source+=`xref\n0 7\n0000000000 65535 f \n${positions.slice(1).map(value => `${String(value).padStart(10,'0')} 00000 n `).join('\n')}\ntrailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  return Buffer.from(source);
}
