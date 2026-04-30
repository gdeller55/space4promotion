import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function PDFDownloader({ 
  reportData, 
  dateRange, 
  advertiserName,
  fileName = 'report.pdf',
  buttonText = 'Download PDF',
  variant = 'outline'
}) {
  const [generating, setGenerating] = React.useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      // Create a hidden container for PDF content
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.width = '800px';
      pdfContainer.style.backgroundColor = 'white';
      pdfContainer.style.padding = '40px';
      document.body.appendChild(pdfContainer);

      // Build PDF content
      pdfContainer.innerHTML = `
        <div style="font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0e7490; font-size: 28px; margin: 0;">Space4Promotion</h1>
            <p style="color: #64748b; font-size: 14px; margin: 5px 0;">Proof of Play Report</p>
          </div>
          
          <div style="margin-bottom: 25px; padding: 15px; background: #f1f5f9; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <div>
                <p style="margin: 0; font-size: 12px; color: #64748b;">Date Range</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600;">${dateRange}</p>
              </div>
              ${advertiserName ? `
                <div>
                  <p style="margin: 0; font-size: 12px; color: #64748b;">Advertiser</p>
                  <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: 600;">${advertiserName}</p>
                </div>
              ` : ''}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px;">
            <div style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">Total Plays</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 700; color: #0e7490;">${reportData.totalPlays.toLocaleString()}</p>
            </div>
            <div style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">Total Duration</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 700; color: #0e7490;">${Math.floor(reportData.totalSeconds / 60).toLocaleString()}m</p>
            </div>
            <div style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">Active Screens</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 700; color: #0e7490;">${reportData.activeScreens}</p>
            </div>
            <div style="padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">Unique Media</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 700; color: #0e7490;">${reportData.uniqueMedia}</p>
            </div>
          </div>

          <h2 style="font-size: 18px; margin: 25px 0 15px 0; color: #1e293b;">Top Media Performance</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                <th style="padding: 10px; text-align: left; font-weight: 600;">Media</th>
                <th style="padding: 10px; text-align: right; font-weight: 600;">Plays</th>
                <th style="padding: 10px; text-align: right; font-weight: 600;">Duration</th>
                <th style="padding: 10px; text-align: right; font-weight: 600;">Screens</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.mediaPerformance.slice(0, 20).map((item, idx) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px;">${item.title}</td>
                  <td style="padding: 10px; text-align: right;">${item.plays.toLocaleString()}</td>
                  <td style="padding: 10px; text-align: right;">${Math.floor(item.totalSeconds / 60)}m</td>
                  <td style="padding: 10px; text-align: right;">${item.screens}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 40px; text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">Space4Promotion Proof of Play</p>
            <p style="margin: 5px 0 0 0; font-size: 10px; color: #cbd5e1;">Generated on ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      `;

      // Generate canvas from HTML
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }

      pdf.save(fileName);
      document.body.removeChild(pdfContainer);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button 
      onClick={generatePDF} 
      variant={variant}
      disabled={generating}
    >
      <Download className="w-4 h-4 mr-2" />
      {generating ? 'Generating...' : buttonText}
    </Button>
  );
}