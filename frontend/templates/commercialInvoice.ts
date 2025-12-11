export const commercialInvoiceTemplateHTML = `
<div class="ci-wrapper">
    <h1>COMMERCIAL INVOICE</h1>

    <table class="ci-table" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <colgroup>
            <col style="width: 15%;">
            <col style="width: 35%;">
            <col style="width: 8.33%;">
            <col style="width: 8.33%;">
            <col style="width: 8.33%;">
            <col style="width: 12.5%;">
            <col style="width: 12.5%;">
        </colgroup>
        <tbody>
            <!-- Row 1: Headers for Shipper & Invoice Info -->
            <tr>
                <td colspan="2" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; vertical-align: middle;">Shipper / Exporter</td>
                <td colspan="5" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; vertical-align: middle;">Invoice & L/C Details</td>
            </tr>
            <!-- Row 1: Content -->
            <tr>
                <td colspan="2" style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; height: 150px;">
                    <mark>[seller_name]</mark><br>
                    <mark>[seller_address]</mark><br>
                    <mark>[seller_city]</mark>, <mark>[seller_country]</mark>
                </td>
                <td colspan="5" style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;">
                    <div style="margin-bottom: 10px;">
                        <span style="font-weight: bold; display: block; color: #666; font-size: 0.9em;">No. & Date of Invoice</span>
                        <div><mark>[ci_no]</mark> / <mark>[ci_date]</mark></div>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <span style="font-weight: bold; display: block; color: #666; font-size: 0.9em;">No. & Date of L/C</span>
                        <div><mark>[l/c_no]</mark> / <mark>[l/c_date]</mark></div>
                    </div>
                    <div>
                        <span style="font-weight: bold; display: block; color: #666; font-size: 0.9em;">L/C Issuing Bank</span>
                        <div><mark>[l/c_bank]</mark></div>
                    </div>
                </td>
            </tr>

            <!-- Row 2: Headers for Consignee & Remarks -->
            <tr>
                <td colspan="2" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; vertical-align: middle;">Consignee</td>
                <td colspan="5" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; vertical-align: middle;">Remarks</td>
            </tr>
            <!-- Row 2: Content -->
            <tr>
                <td colspan="2" style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; height: 120px;">
                    <mark>[buyer_name]</mark><br>
                    <mark>[buyer_address]</mark><br>
                    <mark>[buyer_city]</mark>, <mark>[buyer_country]</mark>
                </td>
                <td colspan="5" style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;">
                    <mark>[remarks]</mark><br>
                    <mark>[incoterms]</mark><mark>[incoterms_port]</mark>
                </td>
            </tr>

            <!-- Row 3: Header for Notify Party -->
            <tr>
                <td colspan="7" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; vertical-align: middle;">Notify Party</td>
            </tr>
            <!-- Row 3: Content -->
            <tr>
                <td colspan="7" style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; height: 100px;">
                    <mark>[buyer_name]</mark><br>
                    <mark>[buyer_address]</mark><br>
                    (Same as Consignee)
                </td>
            </tr>

            <!-- Row 4: Headers for Shipping Details -->
            <tr>
                <td colspan="2" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; vertical-align: middle;">Port of Loading</td>
                <td colspan="2" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; vertical-align: middle;">Final Destination</td>
                <td colspan="2" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; vertical-align: middle;">Carrier</td>
                <td style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; vertical-align: middle;">Sailing on or about</td>
            </tr>
            <!-- Row 4: Content -->
            <tr>
                <td colspan="2" style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;">
                    <mark>[pol]</mark>
                </td>
                <td colspan="2" style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;">
                    <mark>[final_destination]</mark>
                </td>
                <td colspan="2" style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;">
                    <mark>[carrier]</mark>
                </td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;">
                    <mark>[shipment_deadline]</mark>
                </td>
            </tr>

            <!-- Goods Header -->
            <tr>
                <td rowspan="2" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">Marks and Numbers</td>
                <td rowspan="2" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">Description of Goods</td>
                <td colspan="3" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">Quantity</td>
                <td rowspan="2" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">Unit Price</td>
                <td rowspan="2" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">Amount</td>
            </tr>
            <tr>
                <td style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">EA/BOX</td>
                <td style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">Box</td>
                <td style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">Total EA</td>
            </tr>

            <!-- Goods Content -->
            <tr style="height: 300px;">
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;">
                    <mark>[marks_and_numbers]</mark>
                </td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;">
                    <mark>[description]</mark>
                </td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;">
                    <mark>[ea_box]</mark>
                </td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;">
                    <mark>[box]</mark>
                </td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;">
                    <mark>[quantity]</mark>
                </td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: right;">
                    <mark>[unit_price]</mark>/<mark>[unit]</mark> <mark>[currency]</mark>
                </td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: right;">
                    <mark>[sub_total_price]</mark><mark>[currency]</mark>
                </td>
            </tr>

            <!-- Footer: Totals -->
            <tr style="background-color: #f0f0f0; font-weight: bold;">
                <td colspan="2" style="text-align: right; border: 1px solid #d1d5db; padding: 8px; vertical-align: middle;">TOTAL :</td>
                <td style="text-align: center; border: 1px solid #d1d5db; padding: 8px; vertical-align: middle;"><mark>[total_ea/box]</mark></td>
                <td style="text-align: center; border: 1px solid #d1d5db; padding: 8px; vertical-align: middle;"><mark>[total_box]</mark></td>
                <td style="text-align: center; border: 1px solid #d1d5db; padding: 8px; vertical-align: middle;"><mark>[total_quantity]</mark></td>
                <td colspan="2" style="text-align: right; border: 1px solid #d1d5db; padding: 8px; vertical-align: middle;">
                    <mark>[total_price]</mark><mark>[currency]</mark>
                </td>
            </tr>

            <!-- Footer: Signature -->
            <tr>
                <td colspan="7" style="padding: 20px; border: 1px solid #d1d5db; border-top: none;">
                    <div style="display: flex; justify-content: flex-end;">
                        <div style="text-align: center; width: 250px;">
                            <div style="font-weight: bold; text-align: left; margin-bottom: 20px;">Signed by :</div>
                            <div style="font-weight: bold; margin-bottom: 5px;"><mark>[seller_name]</mark></div>
                            <div style="border-top: 1px solid #000; padding-top: 5px;">Authorized Signature</div>
                        </div>
                    </div>
                </td>
            </tr>
        </tbody>
    </table>
</div>
`;
