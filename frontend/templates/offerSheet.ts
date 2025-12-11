export const offerSheetTemplateHTML = `
<div class="offer-sheet-wrapper">
    <h1 style="text-align: center;">OFFER SHEET</h1>
    <div style="text-align: center; margin-bottom: 40px; font-size: 1.5em; font-weight: normal;"><mark>[seller_name]</mark></div>

    <!-- 상단 정보 -->
    <div class="meta">
        <div class="meta-row">
            <span class="meta-label">Date :</span> <mark>[offer_date]</mark>
        </div>
        <div class="meta-row">
            <span class="meta-label">Ref No. :</span> <mark>[offer_no]</mark>
        </div>
        <div class="meta-row">
            <span class="meta-label">MESSRS. :</span> <mark>[buyer_name]</mark>
        </div>
    </div>

    <p>We are pleased to offer you as follows;</p><p></p>

    <!-- 아이템 테이블 -->
    <div class="items-wrapper">
        <table class="offer-table" style="width: 100%; border-collapse: collapse;">
            <colgroup>
                <col style="width: 10%;">
                <col style="width: 14%;">
                <col style="width: 26%;">
                <col style="width: 10%;">
                <col style="width: 10%;">
                <col style="width: 15%;">
                <col style="width: 15%;">
            </colgroup>
            <thead>
                <tr>
                    <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Item No.</th>
                    <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">HS-CODE</th>
                    <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Product</th>
                    <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">C/O</th>
                    <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Q'ty</th>
                    <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Unit Price</th>
                    <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;">
                        <span data-field-id="item_no" class="data-field">[item_no]</span>
                    </td>
                    <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;">
                        <span data-field-id="hscode" class="data-field">[hscode]</span>
                    </td>
                    <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;">
                        <span data-field-id="description" class="data-field">[description]</span>
                    </td>
                    <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;">
                        <span data-field-id="coo" class="data-field">[coo]</span>
                    </td>
                    <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;">
                        <span data-field-id="quantity" class="data-field">[quantity]</span>
                    </td>
                    <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: right;">
                        <span data-field-id="unit_price" class="data-field">[unit_price]</span> / <span data-field-id="currency" class="data-field">[currency]</span>
                    </td>
                    <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: right;">
                        <span data-field-id="sub_total_price" class="data-field">[sub_total_price]</span>
                    </td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td style="border: 1px solid #d1d5db; background-color: #f0f0f0;"></td>
                    <td style="border: 1px solid #d1d5db; background-color: #f0f0f0;"></td>
                    <td style="padding: 8px; border: 1px solid #d1d5db; background-color: #f0f0f0; font-weight: bold;">TOTAL:</td>
                    <td style="border: 1px solid #d1d5db; background-color: #f0f0f0;"></td>
                    <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center; background-color: #f0f0f0; font-weight: bold;"><span data-field-id="total_quantity" class="data-field">[total_quantity]</span></td>
                    <td style="border: 1px solid #d1d5db; background-color: #f0f0f0;"></td>
                    <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right; background-color: #f0f0f0; font-weight: bold;"><span data-field-id="total_price" class="data-field">[total_price]</span></td>
                </tr>
            </tfoot>
        </table>
    </div>

    <!-- 하단 조건들 -->
    <div class="detail-block"><p></p>
        <div class="detail-row">
            <span class="detail-label">Shipment : </span> <mark>[shipment_term]</mark>
        </div>
        <div class="detail-row">
            <span class="detail-label">Inspection : </span> <mark>[inspection]</mark>
        </div>
        <div class="detail-row">
            <span class="detail-label">Payment : </span> <mark>[payment_term]</mark>
        </div>
        <div class="detail-row">
            <span class="detail-label">Validity : </span> <mark>[offer_validity]</mark>
        </div>
        <div class="detail-row">
            <span class="detail-label">Remarks : </span> <mark>[remarks]</mark>
        </div>
    </div>
    <p><p>

    <div class="signature">
        Sincerely yours,<br><br>
        <mark>[seller_name]</mark>
    </div>

    <div class="sign-line"></div>

    <div class="appendix">
        APPENDIX
    </div>
</div>
`;
