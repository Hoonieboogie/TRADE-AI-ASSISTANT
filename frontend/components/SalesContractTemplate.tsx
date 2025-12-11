export function SalesContractTemplate({ hasErrors }: { hasErrors: boolean }) {
  return (
    <>
      {/* Page 1: Specific Conditions */}
      <div style={{ textAlign: 'center', marginTop: '0', marginBottom: '40px' }} contentEditable="false" suppressContentEditableWarning>
        <h1 style={{ fontSize: '24pt', fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '5px', margin: '0' }}>Sale Contract</h1>
      </div>

      <div style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '3px', marginBottom: '30px', marginTop: '40px' }} contentEditable="false" suppressContentEditableWarning>
        Specific Conditions
      </div>

      <p style={{ marginBottom: '15px', textAlign: 'justify' }}>
        <span contentEditable="false" suppressContentEditableWarning>The purpose of this contract is to stipulate the rights, obligations, and all matters of both parties necessary for </span>
        <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Seller Name ]</span>
        <span contentEditable="false" suppressContentEditableWarning> (hereinafter referred to as "Supplier") and </span>
        <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Buyer Name ]</span>
        <span contentEditable="false" suppressContentEditableWarning> (hereinafter referred to as "Buyer") to sign the Overseas distribution contract for the distribution of the following goods. 'Supplier' and 'Buyer' are hereinafter referred to as "Parties to the Contract" or "Parties".</span>
      </p>

      {/* Item Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', border: '1px solid #000' }}>
        <thead contentEditable="false" suppressContentEditableWarning>
          <tr style={{ height: '35px' }}>
            <th style={{ width: '10%', border: '1px solid #ccc', padding: '8px', backgroundColor: '#000', color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Item No.</th>
            <th style={{ width: '35%', border: '1px solid #ccc', padding: '8px', backgroundColor: '#000', color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Commodity & Description</th>
            <th style={{ width: '15%', border: '1px solid #ccc', padding: '8px', backgroundColor: '#000', color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Quantity</th>
            <th style={{ width: '15%', border: '1px solid #ccc', padding: '8px', backgroundColor: '#000', color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Unit Price</th>
            <th style={{ width: '15%', border: '1px solid #ccc', padding: '8px', backgroundColor: '#000', color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Total</th>
            <th style={{ width: '10%', border: '1px solid #ccc', padding: '8px', backgroundColor: '#000', color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Notice</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ height: '25px' }}>
            <td style={{ border: '1px solid #ccc', padding: '5px', verticalAlign: 'top' }}></td>
            <td style={{ border: '1px solid #ccc', padding: '5px', verticalAlign: 'top' }}></td>
            <td style={{ border: '1px solid #ccc', padding: '5px', verticalAlign: 'top' }}></td>
            <td style={{ border: '1px solid #ccc', padding: '5px', verticalAlign: 'top' }}></td>
            <td style={{ border: '1px solid #ccc', padding: '5px', verticalAlign: 'top' }}></td>
            <td style={{ border: '1px solid #ccc', padding: '5px', verticalAlign: 'top' }}></td>
          </tr>
        </tbody>
      </table>

      {/* Conditions List */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
          <span contentEditable="false" suppressContentEditableWarning style={{ fontSize: '8pt', marginRight: '15px', position: 'relative', top: '-2px' }}>■</span>
          <div style={{ flex: 1 }}>
            <span contentEditable="false" suppressContentEditableWarning>Time of Shipment : </span>
            <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
            <br />
            <span contentEditable="false" suppressContentEditableWarning>* Cancellation Date for Late Shipment : </span>
            <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
          <span contentEditable="false" suppressContentEditableWarning style={{ fontSize: '8pt', marginRight: '15px', position: 'relative', top: '-2px' }}>■</span>
          <div style={{ flex: 1 }}>
            <span contentEditable="false" suppressContentEditableWarning>Port of Shipment : </span>
            <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
          <span contentEditable="false" suppressContentEditableWarning style={{ fontSize: '8pt', marginRight: '15px', position: 'relative', top: '-2px' }}>■</span>
          <div style={{ flex: 1 }}>
            <span contentEditable="false" suppressContentEditableWarning>Port of Destination : </span>
            <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
          <span contentEditable="false" suppressContentEditableWarning style={{ fontSize: '8pt', marginRight: '15px', position: 'relative', top: '-2px' }}>■</span>
          <div style={{ flex: 1 }} contentEditable="false" suppressContentEditableWarning>
            Partial Shipment : Allowed [ ✓ ], Not Allowed [ &nbsp; ]
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
          <span contentEditable="false" suppressContentEditableWarning style={{ fontSize: '8pt', marginRight: '15px', position: 'relative', top: '-2px' }}>■</span>
          <div style={{ flex: 1 }} contentEditable="false" suppressContentEditableWarning>
            Transhipment : Allowed [ ✓ ], Not Allowed [ &nbsp; ]
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
          <span contentEditable="false" suppressContentEditableWarning style={{ fontSize: '8pt', marginRight: '15px', position: 'relative', top: '-2px' }}>■</span>
          <div style={{ flex: 1 }}>
            <span contentEditable="false" suppressContentEditableWarning>Delivery Terms : </span>
            <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
            <span contentEditable="false" suppressContentEditableWarning> Incoterms 2020</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
          <span contentEditable="false" suppressContentEditableWarning style={{ fontSize: '8pt', marginRight: '15px', position: 'relative', top: '-2px' }}>■</span>
          <div style={{ flex: 1 }} contentEditable="false" suppressContentEditableWarning>
            Payment
          </div>
        </div>
      </div>

      {/* Payment Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', marginBottom: '20px', border: '1px solid #000' }}>
        <tbody>
          <tr>
            <td rowSpan={3} style={{ width: '20%', border: '1px solid #000', padding: '5px', backgroundColor: '#d9d9d9', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }} contentEditable="false" suppressContentEditableWarning>
              Letter of Credit (L/C)
            </td>
            <td style={{ width: '20%', border: '1px solid #000', padding: '5px', backgroundColor: '#d9d9d9', fontWeight: 'bold', textAlign: 'center' }} contentEditable="false" suppressContentEditableWarning>
              Sight Credit
            </td>
            <td style={{ width: '5%', border: '1px solid #000', padding: '5px', textAlign: 'center' }} contentEditable="false" suppressContentEditableWarning>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1px solid #000', borderRadius: '50%', backgroundColor: '#000' }}></span>
            </td>
            <td style={{ border: '1px solid #000', padding: '5px' }} contentEditable="false" suppressContentEditableWarning>
              irrevocable documentary credit payable at sight
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '5px', backgroundColor: '#d9d9d9', fontWeight: 'bold', textAlign: 'center' }} contentEditable="false" suppressContentEditableWarning>
              Deferred Payment Credit
            </td>
            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} contentEditable="false" suppressContentEditableWarning>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1px solid #000', borderRadius: '50%' }}></span>
            </td>
            <td style={{ border: '1px solid #000', padding: '5px' }}>
              <span contentEditable="false" suppressContentEditableWarning>irrevocable documentary credit with deferred payment at </span>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
              <span contentEditable="false" suppressContentEditableWarning> days from B/L(AWB) date</span>
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '5px', backgroundColor: '#d9d9d9', fontWeight: 'bold', textAlign: 'center' }} contentEditable="false" suppressContentEditableWarning>
              Acceptance Credit
            </td>
            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} contentEditable="false" suppressContentEditableWarning>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1px solid #000', borderRadius: '50%' }}></span>
            </td>
            <td style={{ border: '1px solid #000', padding: '5px' }}>
              <span contentEditable="false" suppressContentEditableWarning>irrevocable documentary credit with acceptance of drafts at </span>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
              <span contentEditable="false" suppressContentEditableWarning> days from B/L(AWB) date</span>
            </td>
          </tr>
          <tr>
            <td rowSpan={2} style={{ border: '1px solid #000', padding: '5px', backgroundColor: '#d9d9d9', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' }} contentEditable="false" suppressContentEditableWarning>
              Documentary Collection
            </td>
            <td style={{ border: '1px solid #000', padding: '5px', backgroundColor: '#d9d9d9', fontWeight: 'bold', textAlign: 'center' }} contentEditable="false" suppressContentEditableWarning>
              D/P
            </td>
            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} contentEditable="false" suppressContentEditableWarning>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1px solid #000', borderRadius: '50%' }}></span>
            </td>
            <td style={{ border: '1px solid #000', padding: '5px' }} contentEditable="false" suppressContentEditableWarning>
              documents against payment
            </td>
          </tr>
          <tr>
            <td style={{ border: '1px solid #000', padding: '5px', backgroundColor: '#d9d9d9', fontWeight: 'bold', textAlign: 'center' }} contentEditable="false" suppressContentEditableWarning>
              D/A
            </td>
            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} contentEditable="false" suppressContentEditableWarning>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1px solid #000', borderRadius: '50%' }}></span>
            </td>
            <td style={{ border: '1px solid #000', padding: '5px' }}>
              <span contentEditable="false" suppressContentEditableWarning>documents against acceptance payable at </span>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
              <span contentEditable="false" suppressContentEditableWarning> days from B/L(AWB) date</span>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ border: '1px solid #000', padding: '5px', backgroundColor: '#d9d9d9', fontWeight: 'bold', textAlign: 'center' }} contentEditable="false" suppressContentEditableWarning>
              Payment in Advance
            </td>
            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} contentEditable="false" suppressContentEditableWarning>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1px solid #000', borderRadius: '50%' }}></span>
            </td>
            <td style={{ border: '1px solid #000', padding: '5px' }}>
              <span contentEditable="false" suppressContentEditableWarning>T/T (Telegraph Transfer) within </span>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
              <span contentEditable="false" suppressContentEditableWarning> days from B/L(AWB) date</span>
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ border: '1px solid #000', padding: '5px', backgroundColor: '#d9d9d9', fontWeight: 'bold', textAlign: 'center' }} contentEditable="false" suppressContentEditableWarning>
              Other
            </td>
            <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }} contentEditable="false" suppressContentEditableWarning>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '1px solid #000', borderRadius: '50%' }}></span>
            </td>
            <td style={{ border: '1px solid #000', padding: '5px' }}>
              <span contentEditable="false" suppressContentEditableWarning>T/T (Telegraph Transfer) at least </span>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
              <span contentEditable="false" suppressContentEditableWarning> days before the agreed date of shipment</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* More Conditions */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
          <span contentEditable="false" suppressContentEditableWarning style={{ fontSize: '8pt', marginRight: '15px', position: 'relative', top: '-2px' }}>■</span>
          <div style={{ flex: 1 }} contentEditable="false" suppressContentEditableWarning>
            Insurance : Cargo insurance shall be arranged by the Buyer at its own cost and risk.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
          <span contentEditable="false" suppressContentEditableWarning style={{ fontSize: '8pt', marginRight: '15px', position: 'relative', top: '-2px' }}>■</span>
          <div style={{ flex: 1 }} contentEditable="false" suppressContentEditableWarning>
            Packing : Export standard packing suitable for sea shipment
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
          <span contentEditable="false" suppressContentEditableWarning style={{ fontSize: '8pt', marginRight: '15px', position: 'relative', top: '-2px' }}>■</span>
          <div style={{ flex: 1 }}>
            <span contentEditable="false" suppressContentEditableWarning>Marking : </span>
            <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
          <span contentEditable="false" suppressContentEditableWarning style={{ fontSize: '8pt', marginRight: '15px', position: 'relative', top: '-2px' }}>■</span>
          <div style={{ flex: 1 }}>
            <span contentEditable="false" suppressContentEditableWarning>Documents Required :</span>
            <div style={{ marginTop: '5px', paddingLeft: '0' }} contentEditable="false" suppressContentEditableWarning>
              <div style={{ marginBottom: '5px' }}>Full set of clean on board ocean Bills of Lading made out to order and blank endorsed</div>
              <div style={{ marginBottom: '5px' }}>Signed Commercial Invoice in 1 original</div>
              <div style={{ marginBottom: '5px' }}>Packing List in 1 original</div>
              <div style={{ marginBottom: '5px' }}>Certificate of Origin in 1 original</div>
              <div style={{ marginBottom: '5px' }}>MSDS / COA (if requested by Buyer)</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px' }}>
          <span contentEditable="false" suppressContentEditableWarning style={{ fontSize: '8pt', marginRight: '15px', position: 'relative', top: '-2px' }}>■</span>
          <div style={{ flex: 1 }} contentEditable="false" suppressContentEditableWarning>
            Other : Details not specified herein shall be mutually agreed between the Parties in writing.
          </div>
        </div>
      </div>

      <p style={{ marginTop: '60px', marginBottom: '60px' }} contentEditable="false" suppressContentEditableWarning>
        These Specific Conditions are subject to the General Terms and Conditions set forth below.
      </p>

      {/* Signature Container */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '80px', marginBottom: '50px' }}>
        <div style={{ width: '48%' }}>
          <div style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '30px', fontSize: '11pt' }} contentEditable="false" suppressContentEditableWarning>
            The Seller
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span contentEditable="false" suppressContentEditableWarning style={{ whiteSpace: 'nowrap', marginRight: '10px' }}>By :</span>
            <span className="editable-field" contentEditable="true" suppressContentEditableWarning style={{ flexGrow: 1 }}></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span contentEditable="false" suppressContentEditableWarning style={{ whiteSpace: 'nowrap', marginRight: '10px' }}>Address :</span>
            <span className="editable-field" contentEditable="true" suppressContentEditableWarning style={{ flexGrow: 1 }}></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span contentEditable="false" suppressContentEditableWarning style={{ whiteSpace: 'nowrap', marginRight: '10px' }}>Name / Title :</span>
            <span style={{ flexGrow: 1, borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span contentEditable="false" suppressContentEditableWarning style={{ whiteSpace: 'nowrap', marginRight: '10px' }}>Signature :</span>
            <span style={{ flexGrow: 1, borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning></span>
          </div>
        </div>
        <div style={{ width: '48%' }}>
          <div style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '30px', fontSize: '11pt' }} contentEditable="false" suppressContentEditableWarning>
            The Buyer
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span contentEditable="false" suppressContentEditableWarning style={{ whiteSpace: 'nowrap', marginRight: '10px' }}>By :</span>
            <span className="editable-field" contentEditable="true" suppressContentEditableWarning style={{ flexGrow: 1 }}></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span contentEditable="false" suppressContentEditableWarning style={{ whiteSpace: 'nowrap', marginRight: '10px' }}>Address :</span>
            <span className="editable-field" contentEditable="true" suppressContentEditableWarning style={{ flexGrow: 1 }}></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span contentEditable="false" suppressContentEditableWarning style={{ whiteSpace: 'nowrap', marginRight: '10px' }}>Name / Title :</span>
            <span style={{ flexGrow: 1, borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <span contentEditable="false" suppressContentEditableWarning style={{ whiteSpace: 'nowrap', marginRight: '10px' }}>Signature :</span>
            <span style={{ flexGrow: 1, borderBottom: '1px solid #000' }} contentEditable="false" suppressContentEditableWarning></span>
          </div>
        </div>
      </div>

      {/* Page Break */}
      <div style={{ pageBreakBefore: 'always', marginTop: '60px' }} contentEditable="false" suppressContentEditableWarning></div>

      {/* Page 2: General Terms and Conditions */}
      <div style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '3px', marginBottom: '30px', marginTop: '40px' }} contentEditable="false" suppressContentEditableWarning>
        General Terms and Conditions
      </div>

      <p style={{ textAlign: 'justify', marginBottom: '20px' }} contentEditable="false" suppressContentEditableWarning>
        Other detailed terms and conditions of this contract are specified in the following 'General Terms and Conditions'. 'Supplier' and 'Purchaser' agree to the main contracts and "General Terms and Conditions", and to prove the establishment of this contract, two copies of the contract shall be prepared, mutually signed, and each part shall keep one copy of contract.
      </p>

      <div style={{ textAlign: 'justify' }}>
        {/* Article 1 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          1. [General]
        </h3>
        <p contentEditable="false" suppressContentEditableWarning>
          These General Terms and Conditions are intended to be applied together with the Specific Conditions. In case of contradiction between these General Terms and Conditions and the Specific Conditions agreed between the parties, the Specific Conditions shall prevail.
        </p>

        {/* Article 2 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          2. [Sales Territory, Channel]
        </h3>
        <ol style={{ margin: '0', paddingLeft: '20px' }} contentEditable="false" suppressContentEditableWarning>
          <li style={{ marginBottom: '5px' }}>'Supplier' authorizes the sales right for distribution channel in [ Territory ] to 'Buyer'</li>
          <li style={{ marginBottom: '5px' }}>The sales permission area is designated as [ Territory ] (hereinafter referred to as "region"), and 'Buyer' has the right to distribute and sell within the contract period.</li>
          <li style={{ marginBottom: '5px' }}>'Buyer' can conduct general sales within the scope of authorized region when its sales</li>
          <li style={{ marginBottom: '5px' }}>The buyer's sales channels are permitted only for this contract are as follows. In case of adding sales channels, they can be added by mutual agreement.</li>
        </ol>
        <div style={{ marginLeft: '20px', fontWeight: 'bold', marginTop: '10px' }} contentEditable="false" suppressContentEditableWarning>
          A. Sales Channels :
        </div>

        {/* Article 3 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          3. [Shipment]
        </h3>
        <ol style={{ margin: '0', paddingLeft: '20px' }} contentEditable="false" suppressContentEditableWarning>
          <li style={{ marginBottom: '5px' }}>The date of issuance of the bill of lading will be deemed to be the date of shipment unless the bill of lading contains an on board notation indicating the date of shipment, in which case the date stated in the on board notation will be deemed to be the date of shipment.</li>
          <li style={{ marginBottom: '5px' }}>Partial shipment and/or transshipment shall be permitted unless otherwise stated in this Sales Contract.</li>
          <li style={{ marginBottom: '5px' }}>The Seller shall not be responsible for any delay in shipment due to the Buyer's failure to provide timely a documentary credit, as the case maybe, in conformity with this Sales Contract. The Seller shall not be responsible for any damages incurred by the Buyer due to either delay in arrival of the ship and/or airplane designated by the Buyer beyond the prearranged date of shipment.</li>
          <li style={{ marginBottom: '5px' }}>If the parties agreed upon a cancellation date for late shipment in the Specific Conditions, the Buyer may avoid the Sales Contract by notification to the Seller in case the shipment has not occurred by the cancellation date.</li>
        </ol>

        {/* Article 4 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          4. [Packing and Marking]
        </h3>
        <ol style={{ margin: '0', paddingLeft: '20px' }} contentEditable="false" suppressContentEditableWarning>
          <li style={{ marginBottom: '5px' }}>Packing shall be performed at the Seller's option unless otherwise stated in this Sales Contract. In case special instructions are necessary, the Buyer should provide the Seller with such instructions in a timely manner. All the additional costs thereby incurred shall be borne by the Buyer.</li>
          <li style={{ marginBottom: '5px' }}>Shipping Mark shall be made as shown in the Specific Conditions, if any.</li>
        </ol>

        {/* Article 5 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          5. [Insurance]
        </h3>
        <ol style={{ margin: '0', paddingLeft: '20px' }} contentEditable="false" suppressContentEditableWarning>
          <li style={{ marginBottom: '5px' }}>In case of CIF, 110% of the invoice amount shall be insured with insurance cover complying with the Institute Cargo Clauses (C) or similar clause.</li>
          <li style={{ marginBottom: '5px' }}>In case of CIP, 110% of the invoice amount shall be insured with insurance cover complying with the Institute Cargo Clauses (A) or similar clause.</li>
        </ol>

        {/* Article 6 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          6. [Buyer's Obligation]
        </h3>
        <ol style={{ margin: '0', paddingLeft: '20px' }} contentEditable="false" suppressContentEditableWarning>
          <li style={{ marginBottom: '5px' }}>'Buyer' shall be responsible for sales account, advertisements, and sales promotions, and make best efforts to maximize sales in region.</li>
          <li style={{ marginBottom: '5px' }}>'Buyer' must obtain the permission from 'Supplier' when distributing articles related to permitted product to use and produce promotional materials, regardless of form as online and offline banners, catalogs, and pamphlets, etc.</li>
          <li style={{ marginBottom: '5px' }}>'Buyer' has the right to select customers, sub-distributors or partners within the defined region. However, before choosing a partner, share the partner's information with 'Supplier' in advance. All of these customers, sub-distributors or partners are also required to comply with the entire contract.</li>
          <li style={{ marginBottom: '5px' }}>'Buyer' shall investigate the complaints received by customers or business partners within the region and shall discuss the relevant measures with 'Supplier'</li>
          <li style={{ marginBottom: '5px' }}>'Buyer' shall not disclose and use any confidential products or information related to 'Supplier' to a third party without prior written consent of 'Supplier', except for the obligation under this contract. However, this is not limited to prices, discounts, conditions, periods or information that are directly or indirectly transmitted from 'Supplier', or acquired in the process of trading with 'Supplier'.</li>
        </ol>

        {/* Article 7 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          7. [Supplier's Obligation]
        </h3>
        <ol style={{ margin: '0', paddingLeft: '20px' }} contentEditable="false" suppressContentEditableWarning>
          <li style={{ marginBottom: '5px' }}>'Supplier' shall support distributor's marketing activities. Especially, 'Supplier' shall make its best effort to support the documentations for marketing. However, it is limited to approved data.</li>
          <li style={{ marginBottom: '5px' }}>'Supplier' shall make its best effort to support the documentations for distribution and sales such as product information, export customs clearance documents, import sales (including certification).</li>
          <li style={{ marginBottom: '5px' }}>'Supplier' shall not infringe the authority of 'Buyer' in direct or indirect based on this contract, through its employees, agents or other agencies or either on its own</li>
          <li style={{ marginBottom: '5px' }}>In the case of changing specifications such as important raw materials or product design in 'Supplier', 'Supplier' shall notify 'Buyer' by e-mail or writing before 20 days prior to the expected application of the change.</li>
        </ol>

        {/* Article 8 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          8. [Inspection]
        </h3>
        <ol style={{ margin: '0', paddingLeft: '20px' }} contentEditable="false" suppressContentEditableWarning>
          <li style={{ marginBottom: '5px' }}>The inspection of the Goods shall be done according to the export regulation of the Republic of Korea and/or by the manufacturer(s), and such inspection shall be considered as final.</li>
          <li style={{ marginBottom: '5px' }}>Should any specific inspector be designated by the Buyer, all additional charges incurred thereby shall be borne by the Buyer and shall be added to the invoice amount, for which the documentary credit, if any, shall be amended accordingly.</li>
        </ol>

        {/* Article 9 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          9. [Supply and Payment]
        </h3>
        <ol style={{ margin: '0', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '5px' }} contentEditable="false" suppressContentEditableWarning>When ordering, 'Buyer' shall clarify information such as packing method, destination information, and order quantity, etc.</li>
          <li style={{ marginBottom: '5px' }} contentEditable="false" suppressContentEditableWarning>'Supplier' shall notify to 'Buyer' the available quantity and delivery date within 3 business days from the date the order is received.</li>
          <li style={{ marginBottom: '5px' }} contentEditable="false" suppressContentEditableWarning>If the parties have agreed on payment by a documentary credit, then, unless otherwise agreed, a documentary credit in favor of the Seller shall be issued within [ ] days from the date of this Sales Contract by a reputable bank, subject to the latest Uniform Customs and Practice for Documentary Credits (UCP) of the International Chamber of Commerce. The amount of such credit shall be sufficient to cover this contract amount.</li>
          <li style={{ marginBottom: '5px' }}>
            <span contentEditable="false" suppressContentEditableWarning>If the parties have agreed on payment by a documentary collection, then, unless otherwise agreed, the collection will be subject to the latest Uniform Rules for Collection (URC) of the International Chamber of Commerce.</span>
            <ul style={{ listStyleType: 'none', paddingLeft: '20px' }}>
              <li style={{ marginBottom: '5px' }} contentEditable="false" suppressContentEditableWarning>(a) In case of D/P, the Seller shall deliver a sight bill(s) of exchange drawn on the Buyer together with the required documents to the Buyer through banks, and the Buyer shall effect the payment immediately upon the first presentation of the bill(s) of exchange and the required documents.</li>
              <li style={{ marginBottom: '5px' }} contentEditable="false" suppressContentEditableWarning>(b) In case of D/A, the Seller shall deliver a time bill(s) of exchange drawn on the Buyer together with the required documents to the Buyer through banks, and the Buyer shall accept the bill(s) of exchange immediately upon the first presentation of the bill(s) of exchange and the required documents and shall effect the payment on the maturity date of the bill(s) of exchange.</li>
            </ul>
          </li>
          <li style={{ marginBottom: '5px' }} contentEditable="false" suppressContentEditableWarning>If the parties have agreed on payment by an open account, then, unless otherwise agreed, the Buyer shall pay the invoice value of the goods to the Seller's account with the bank designated by the Seller by means of telegraphic transfer (T/T) within the specified date under the Specific Conditions.</li>
          <li style={{ marginBottom: '5px' }} contentEditable="false" suppressContentEditableWarning>If the parties have agreed on payment by a payment in advance, then, unless otherwise agreed, the Buyer shall pay the agreed amount to the Seller's account with the bank designated by the Seller by means of telegraphic transfer (T/T) within the specified date under the Specific Conditions.</li>
          <li style={{ marginBottom: '5px' }} contentEditable="false" suppressContentEditableWarning>Payment is negotiable like <strong>50% pre-deposit on the date of order (proforma invoice issuance date), and balance the remaining 50% before shipment</strong> to the bank account designated by 'Supplier' as T/T. The prices for products follow in accordance with the supply price agreed in advance.</li>
        </ol>

        {/* Article 10 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          10. [Warranty]
        </h3>
        <p contentEditable="false" suppressContentEditableWarning>
          ① The Goods shall conform to the specification (and/or description) set forth in this Sales Contract, and shall be of good material & workmanship and free from any defect for at least [ Warranty Period ] months from the date of shipment.
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          ② The extent of the Seller's liability under this warranty shall be limited to the repair or replacement as herein provided of any defective goods or parts thereof. However, this warranty does not extend to any of the said goods which have been : (a) subjected to misuse, neglect, accident or abuse, (b) improperly repaired, installed, transported, altered or modified in any way by any other party than Seller or (c) used in violation of instructions furnished by the Seller.
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          ③ Except for the express limited warranties set forth in this article, the Seller makes no other warranty to the Buyer, express or implied, and herby expressly disclaims any warranty of merchantability or fitness for a particular purpose. In no event shall the Seller be liable to the Buyer under this Sales Contract or otherwise for any lost profits or for indirect, incidental or consequential damages for any reason.
        </p>

        {/* Article 11 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          11. [Claims]
        </h3>
        <p contentEditable="false" suppressContentEditableWarning>
          ① Any claim by the Buyer of whatever nature arising under this Sales Contract shall be made by facsimile, cable, or e-mail within [ Claim Period ] days after arrival of the goods at the destination specified in the bills of lading (or airway bill, sea waybill). Full particulars of such claim shall be made in writing, and forwarded by registered mail to the Seller within [ Claim Detail Period ] days after such fax, cabling, or e-mailing.
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          ② The Buyer must submit with particulars the inspection report sworn by a reputable surveyor acceptable to the Seller when the quality or quantity of the goods delivered is in dispute. Failure to make such claim within such period shall constitute acceptance of shipment and agreement of Buyer that such shipment fully complies with applicable terms and conditions.
        </p>

        {/* Article 12 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          12. [Remedy]
        </h3>
        <p contentEditable="false" suppressContentEditableWarning>
          ① The Buyer shall, without limitation, be in default of this Sales Contract, if the Buyer shall become insolvent, bankrupt or fail to make any payment to the Seller including the establishment of the documentary credit within the due date.
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          ② In case of the Buyer's default, Seller may, without prior notice thereof to the Buyer, exercise any of the following remedies among others :
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          (a) terminate this Sales Contract;
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          (b) terminate this Sales Contract as to the portion of the goods in default only, and resell them to recover from Buyer the difference between the price set forth in this Sales Contract and the price obtained upon resale, plus any incidental loss or expense; or
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          (c) terminate this Sales Contract as to any unshipped balance and recover from the Buyer as liquidated damages, a sum of 【 】percent of the price of the unshipped balance.
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          ③ The rights and remedies herein reserved to the Seller shall be cumulative and in addition to any other or further rights and remedies available at law.
        </p>

        {/* Article 13 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          13. [Force Majeure]
        </h3>
        <p contentEditable="false" suppressContentEditableWarning>
          A party shall not be liable for a failure to perform any of his obligations herein if he proves that the failure was due to an impediment beyond his control such as prohibition of exportation, suspension of issuance of export license or other government restriction, act of God, war, blockade, revolution, insurrection, mobilization, strike, lockout or any labor dispute, civil commotion, riot, plague or other epidemic, fire, typhoon, flood, etc, and that he proves that he could not reasonably be expected to have taken the impediment into account at the time of the conclusion of this Sales Contract or to have avoided or overcome its
        </p>

        {/* Article 14 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          14. [Patents, Trade Marks, Designs, etc.]
        </h3>
        <h4 style={{ fontSize: '10pt', fontWeight: 'bold', marginTop: '15px', marginBottom: '5px' }} contentEditable="false" suppressContentEditableWarning>
          ① The Buyer acknowledges and agrees that:
        </h4>
        <p contentEditable="false" suppressContentEditableWarning>
          (a) any and all the Seller's intellectual property rights are the sole and exclusive property of the Seller or its licensors;
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          (b) the Buyer shall not acquire any ownership interest in any of the Seller's intellectual property rights under this Sales Contract;
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          (c) any goodwill derived from the use by the Buyer of the Seller's intellectual property rights inures to the benefit of the Seller or its licensors, as the case may be;
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          (d) if the Buyer acquires any intellectual property rights, rights in or relating to any Goods (including any rights in any trademarks, derivative works or patent improvements relating thereto) by operation of law, or otherwise, such rights are deemed to be the property of and are hereby irrevocably assigned to the Seller or its licensors, as the case may be, without further action by either of the parties; and
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          (e) the Buyer shall use the Seller's intellectual property rights solely for purposes of using the goods under this Sales Contract and only in accordance with this Sales Contract and the instructions of the Seller.
        </p>
        <h4 style={{ fontSize: '10pt', fontWeight: 'bold', marginTop: '15px', marginBottom: '5px' }} contentEditable="false" suppressContentEditableWarning>
          ② The Buyer shall not:
        </h4>
        <p contentEditable="false" suppressContentEditableWarning>
          (a) take any action that interferes with any of the Seller's rights in or to the Seller's intellectual property rights, including the Seller's ownership or exercise thereof;
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          (b) challenge any right, title or interest of Seller in or to the Seller's intellectual property rights;
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          (c) make any claim or take any action adverse to the Seller's ownership of the Seller's intellectual property rights;
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          (d) register or apply for registrations, anywhere in the world, for the Seller's trademarks or any other trademark that is similar to the Seller's trademarks or that incorporates the Seller's trademarks;
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          (e) use any mark, anywhere that is confusingly similar to the Seller's trademarks;
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          (f) engage in any action that tends to disparage, dilute the value of, or reflect negatively on the goods or any of the Seller's trademarks;
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          (g) misappropriate any of the Seller's trademarks for use as a domain name without prior written consent from the Seller; or
        </p>
        <p contentEditable="false" suppressContentEditableWarning>
          (h) alter, obscure or remove any of the Seller's trademark(s), copyright notices or any other proprietary rights notices placed on the goods, marketing materials or other materials that the Seller may provide.
        </p>

        {/* Article 15 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          15. [Confidentiality]
        </h3>
        <p contentEditable="false" suppressContentEditableWarning>
          Not only the duration of the contract, but also for one year after the expiration of the contract maintenance period, according to this contract, 'Buyer' must not divulge any information of product-related technology, commercial information, pricing structure, data, sales, marketing, distribution, projects, plans, management, etc. The violation of this confidentiality obligation constitutes the serious breach of this contract.
        </p>

        {/* Article 16 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          16. [Governing Law]
        </h3>
        <p contentEditable="false" suppressContentEditableWarning>
          All matters arising out of or relating to this Sales Contract are governed by and construed in accordance with the laws of Republic of Korea.
        </p>

        {/* Article 17 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          17. [Arbitration]
        </h3>
        <p contentEditable="false" suppressContentEditableWarning>
          Any dispute arising out of or in connection with this Sales Contract shall be finally settled by arbitration in Seoul in accordance with the International Arbitration Rules of the Korean Commercial Arbitration Board and laws of Korea.
        </p>

        {/* Article 18 */}
        <h3 style={{ fontSize: '11pt', fontWeight: 'bold', marginTop: '25px', marginBottom: '10px' }} contentEditable="false" suppressContentEditableWarning>
          18. [Trade Terms]
        </h3>
        <p contentEditable="false" suppressContentEditableWarning>
          All delivery terms provided in the Contract shall be interpreted in accordance with the latest Incoterms of International Chamber of Commerce.
        </p>
      </div>

      {/* Signature Block */}
      <div style={{ marginTop: '40px' }}>
        <p>
          <span className="editable-field" contentEditable="true" suppressContentEditableWarning>[ Contract Date ]</span>
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <div style={{ width: '45%' }}>
            <p style={{ marginBottom: '10px' }}>
              <span contentEditable="false" suppressContentEditableWarning>Supplier: </span>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
            </p>
            <p style={{ marginBottom: '10px' }}>
              <span contentEditable="false" suppressContentEditableWarning>Address: </span>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
            </p>
            <p>
              <span contentEditable="false" suppressContentEditableWarning>CEO: </span>
              <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '150px' }} contentEditable="false" suppressContentEditableWarning></span>
              <span contentEditable="false" suppressContentEditableWarning> (sign)</span>
            </p>
          </div>
          <div style={{ width: '45%' }}>
            <p style={{ marginBottom: '10px' }}>
              <span contentEditable="false" suppressContentEditableWarning>Buyer: </span>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
            </p>
            <p style={{ marginBottom: '10px' }}>
              <span contentEditable="false" suppressContentEditableWarning>Address: </span>
              <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
            </p>
            <p>
              <span contentEditable="false" suppressContentEditableWarning>CEO: </span>
              <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '150px' }} contentEditable="false" suppressContentEditableWarning></span>
              <span contentEditable="false" suppressContentEditableWarning> (sign)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Page Break */}
      <div style={{ pageBreakBefore: 'always', marginTop: '60px' }} contentEditable="false" suppressContentEditableWarning></div>

      {/* Appendix */}
      <div style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', textDecoration: 'underline', textUnderlineOffset: '3px', marginBottom: '30px', marginTop: '40px' }} contentEditable="false" suppressContentEditableWarning>
        Appendix
      </div>
      <p>
        <span contentEditable="false" suppressContentEditableWarning>1. Product : </span>
        <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
      </p>
      <p>
        <span contentEditable="false" suppressContentEditableWarning>2. Supply Price: </span>
        <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
      </p>
      <p>
        <span contentEditable="false" suppressContentEditableWarning>3. Total Order & Quantity: </span>
        <span className="editable-field" contentEditable="true" suppressContentEditableWarning></span>
      </p>
      <p contentEditable="false" suppressContentEditableWarning>
        4. Lead Time : Within 30 days after PO
      </p>
    </>
  );
}
