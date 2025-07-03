import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function UMDOrgChartApp() {
  const [elements, setElements] = useState([]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws);

      console.log("Parsed JSON:", jsonData);

      const summary = {};
      jsonData.forEach((row) => {
        const unit = row['Unit'] || 'Unknown Unit';
        const ric = row['RIC']?.toString().trim();
        let category = null;

        if (ric === '0004') category = 'Officer';
        else if (ric === '0104') category = 'Enlisted';
        else if (ric === '0160') category = 'Civilian';

        if (category) {
          if (!summary[unit]) {
            summary[unit] = { Officer: 0, Enlisted: 0, Civilian: 0 };
          }
          summary[unit][category]++;
        }
      });

      console.log("Summary:", summary);

      const unitNames = Object.keys(summary);
      if (unitNames.length === 0) return;

      const parent = unitNames[0];

      const nodes = unitNames.map((unit, idx) => {
        const counts = summary[unit];
        const total = counts.Officer + counts.Enlisted + counts.Civilian;
        const label = (
          <div style={{ padding: 10, borderRadius: 5, background: '#f0f0f0', border: '1px solid #ccc' }}>
            <strong>{unit}</strong>
            <div>{`${counts.Officer} / ${counts.Enlisted} / ${counts.Civilian} / ${total}`}</div>
          </div>
        );

        return {
          id: unit,
          data: { label },
          position: { x: 200, y: 120 * idx },
          style: { width: 250 },
        };
      });

      const edges = unitNames.slice(1).map((unit) => ({
        id: `${parent}-${unit}`,
        source: parent,
        target: unit,
        type: 'smoothstep',
      }));

      const finalElements = [...nodes, ...edges];
      console.log("React Flow Elements:", finalElements);
      setElements(finalElements);
    };

    reader.readAsBinaryString(file);
  }, []);

  const exportToPNG = () => {
    const chart = document.getElementById('org-chart');
    if (!chart) return;

    toPng(chart).then((dataUrl) => {
      const link = document.createElement('a');
      link.download = 'org_chart.png';
      link.href = dataUrl;
      link.click();
    });
  };

  const exportToPDF = () => {
    const chart = document.getElementById('org-chart');
    if (!chart) return;

    toPng(chart).then((dataUrl) => {
      const pdf = new jsPDF('landscape', 'pt', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('org_chart.pdf');
    });
  };

  return (
    <div className="p-4 w-full h-screen">
      <h1 className="text-2xl font-bold mb-4">UMD Org Chart (Tree View)</h1>
      <div className="flex gap-4 mb-4">
        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
        <button onClick={exportToPNG} className="px-3 py-1 bg-blue-500 text-white rounded">Export PNG</button>
        <button onClick={exportToPDF} className="px-3 py-1 bg-green-500 text-white rounded">Export PDF</button>
      </div>

      <div
        id="org-chart"
        style={{ width: '100%', height: '80vh', border: '1px solid #ccc', borderRadius: '8px' }}
      >
        <ReactFlow
          nodes={elements.filter(el => !el.source)}
          edges={elements.filter(el => el.source)}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
