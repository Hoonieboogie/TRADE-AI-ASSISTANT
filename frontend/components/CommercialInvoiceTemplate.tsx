export function CommercialInvoiceTemplate({ hasErrors }: { hasErrors: boolean }) {
  return (
    <>
      <div style={{ textAlign: 'center', fontSize: '24pt', fontWeight: 'bold', marginBottom: '30px', textDecoration: 'underline' }} contentEditable="false" suppressContentEditableWarning>
        COMMERCIAL INVOICE
      </div>

      <div style={{ border: '2px solid #000' }}>
        {/* Row 1: Shipper & Invoice Details */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
          <div style={{ width: '50%', padding: '0', borderRight: '1px solid #000', position: 'relative' }}>
            <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0', fontSize: '9pt', backgroundColor: '#f0f0f0', padding: '5px', borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning>
              Shipper / Exporter
            </span>
            <div style={{ padding: '5px' }}>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Shipper Name ]</span>
              <br />
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Address ]</span>
              <br />
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ City, Country ]</span>
              <br /><br /><br />
            </div>
          </div>
          <div style={{ width: '50%', padding: '0' }}>
            <div>
              <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0', fontSize: '9pt', backgroundColor: '#f0f0f0', padding: '5px', borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning>
                No. & Date of Invoice
              </span>
              <div style={{ padding: '5px' }}>
                <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Invoice No. ]</span>
                <span contentEditable="false" suppressContentEditableWarning> / </span>
                <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Date ]</span>
              </div>
            </div>
            <div>
              <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0', fontSize: '9pt', backgroundColor: '#f0f0f0', padding: '5px', borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning>
                No. & Date of L/C
              </span>
              <div style={{ padding: '5px' }}>
                <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ L/C No. ]</span>
                <span contentEditable="false" suppressContentEditableWarning> / </span>
                <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Date ]</span>
              </div>
            </div>
            <div>
              <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0', fontSize: '9pt', backgroundColor: '#f0f0f0', padding: '5px', borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning>
                L/C Issuing Bank
              </span>
              <div style={{ padding: '5px' }}>
                <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Issuing Bank Name ]</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Consignee & Remarks */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
          <div style={{ width: '50%', padding: '0', borderRight: '1px solid #000', position: 'relative' }}>
            <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0', fontSize: '9pt', backgroundColor: '#f0f0f0', padding: '5px', borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning>
              Consignee
            </span>
            <div style={{ padding: '5px' }}>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Consignee Name ]</span>
              <br />
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Address ]</span>
              <br />
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ City, Country ]</span>
              <br /><br />
            </div>
          </div>
          <div style={{ width: '50%', padding: '0' }}>
            <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0', fontSize: '9pt', backgroundColor: '#f0f0f0', padding: '5px', borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning>
              Remarks
            </span>
            <div style={{ padding: '5px' }}>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Enter Remarks Here ]</span>
              <br />
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ e.g., Payment Terms: T/T ... ]</span>
              <br />
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ e.g., Incoterms: CIF ... ]</span>
            </div>
          </div>
        </div>

        {/* Row 3: Notify Party */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
          <div style={{ width: '100%', padding: '0' }}>
            <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0', fontSize: '9pt', backgroundColor: '#f0f0f0', padding: '5px', borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning>
              Notify Party
            </span>
            <div style={{ padding: '5px' }}>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Notify Party Name ]</span>
              <br />
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Address ]</span>
              <br />
              <span contentEditable="false" suppressContentEditableWarning>(Same as Consignee)</span>
            </div>
          </div>
        </div>

        {/* Row 4: Shipping Details */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
          <div style={{ width: '25%', padding: '0', borderRight: '1px solid #000', overflow: 'hidden' }}>
            <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0', fontSize: '9pt', backgroundColor: '#f0f0f0', padding: '5px', borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning>
              Port of Loading
            </span>
            <div style={{ padding: '5px', overflow: 'hidden' }}>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Port of Loading ]</span>
            </div>
          </div>
          <div style={{ width: '25%', padding: '0', borderRight: '1px solid #000', overflow: 'hidden' }}>
            <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0', fontSize: '9pt', backgroundColor: '#f0f0f0', padding: '5px', borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning>
              Final Destination
            </span>
            <div style={{ padding: '5px', overflow: 'hidden' }}>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Final Destination ]</span>
            </div>
          </div>
          <div style={{ width: '25%', padding: '0', borderRight: '1px solid #000', overflow: 'hidden' }}>
            <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0', fontSize: '9pt', backgroundColor: '#f0f0f0', padding: '5px', borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning>
              Carrier
            </span>
            <div style={{ padding: '5px', overflow: 'hidden' }}>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Carrier Name ]</span>
            </div>
          </div>
          <div style={{ width: '25%', padding: '0', overflow: 'hidden' }}>
            <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '0', fontSize: '9pt', backgroundColor: '#f0f0f0', padding: '5px', borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning>
              Sailing on or about
            </span>
            <div style={{ padding: '5px', overflow: 'hidden' }}>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Date ]</span>
            </div>
          </div>
        </div>

        {/* Row 5: Goods Table */}
        <div style={{ display: 'block', padding: '0', borderBottom: '1px solid #000' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0', tableLayout: 'fixed' }}>
            <thead contentEditable="false" suppressContentEditableWarning>
              <tr>
                <th rowSpan={2} style={{ width: '15%', border: '1px solid #000', padding: '5px', textAlign: 'center', backgroundColor: '#f0f0f0', fontSize: '9pt' }}>
                  Marks and Numbers
                </th>
                <th rowSpan={2} style={{ width: '30%', border: '1px solid #000', padding: '5px', textAlign: 'center', backgroundColor: '#f0f0f0', fontSize: '9pt' }}>
                  Description of Goods
                </th>
                <th colSpan={3} style={{ width: '30%', border: '1px solid #000', padding: '5px', textAlign: 'center', backgroundColor: '#f0f0f0', fontSize: '9pt' }}>
                  Quantity
                </th>
                <th rowSpan={2} style={{ width: '12.5%', border: '1px solid #000', padding: '5px', textAlign: 'center', backgroundColor: '#f0f0f0', fontSize: '9pt' }}>
                  Unit Price
                </th>
                <th rowSpan={2} style={{ width: '12.5%', border: '1px solid #000', padding: '5px', textAlign: 'center', backgroundColor: '#f0f0f0', fontSize: '9pt' }}>
                  Amount
                </th>
              </tr>
              <tr>
                <th style={{ width: '10%', border: '1px solid #000', padding: '5px', textAlign: 'center', backgroundColor: '#f0f0f0', fontSize: '9pt' }}>
                  EA/BOX
                </th>
                <th style={{ width: '10%', border: '1px solid #000', padding: '5px', textAlign: 'center', backgroundColor: '#f0f0f0', fontSize: '9pt' }}>
                  Box
                </th>
                <th style={{ width: '10%', border: '1px solid #000', padding: '5px', textAlign: 'center', backgroundColor: '#f0f0f0', fontSize: '9pt' }}>
                  Total EA
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ height: '300px' }}>
                <td style={{ border: '1px solid #000', padding: '5px', verticalAlign: 'top', wordWrap: 'break-word', overflow: 'hidden' }}>
                  <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Marks ]</span>
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', verticalAlign: 'top', wordWrap: 'break-word', overflow: 'hidden' }}>
                  <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Description ]</span>
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', verticalAlign: 'top', textAlign: 'center', wordWrap: 'break-word', overflow: 'hidden' }}>
                  <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ EA/BOX ]</span>
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', verticalAlign: 'top', textAlign: 'center', wordWrap: 'break-word', overflow: 'hidden' }}>
                  <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Box ]</span>
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', verticalAlign: 'top', textAlign: 'center', wordWrap: 'break-word', overflow: 'hidden' }}>
                  <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Total EA ]</span>
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', verticalAlign: 'top', textAlign: 'right', wordWrap: 'break-word', overflow: 'hidden' }}>
                  <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Price ]</span>
                </td>
                <td style={{ border: '1px solid #000', padding: '5px', verticalAlign: 'top', textAlign: 'right', wordWrap: 'break-word', overflow: 'hidden' }}>
                  <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Amount ]</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Row 6: Totals */}
        <div style={{ display: 'flex', borderBottom: '1px solid #000', backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
          <div style={{ width: '50%', padding: '5px', textAlign: 'right', borderRight: 'none', overflow: 'hidden' }} contentEditable="false" suppressContentEditableWarning>
            TOTAL :
          </div>
          <div style={{ width: '10%', padding: '5px', textAlign: 'center', borderRight: 'none', overflow: 'hidden' }}>
            <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ EA/BOX ]</span>
          </div>
          <div style={{ width: '10%', padding: '5px', textAlign: 'center', borderRight: 'none', overflow: 'hidden' }}>
            <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Box ]</span>
          </div>
          <div style={{ width: '5%', padding: '5px', textAlign: 'center', borderRight: 'none', overflow: 'hidden' }}>
            <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Total EA ]</span>
          </div>
          <div style={{ width: '25%', padding: '5px', textAlign: 'right', overflow: 'hidden' }}>
            <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Total Amount ]</span>
          </div>
        </div>

        {/* Row 7: Signature */}
        <div style={{ display: 'flex', borderBottom: 'none' }}>
          <div style={{ width: '100%', padding: '40px 20px 20px 20px', textAlign: 'right' }}>
            <span style={{ fontWeight: 'bold', fontSize: '9pt' }} contentEditable="false" suppressContentEditableWarning>Signed by :</span>
            <br /><br />
            <span style={{ display: 'inline-block', borderBottom: '1px solid #000', width: '250px', marginBottom: '5px' }} contentEditable="false" suppressContentEditableWarning>&nbsp;</span>
            <br />
            <span contentEditable="false" suppressContentEditableWarning>Authorized Signature</span>
          </div>
        </div>
      </div>
    </>
  );
}