export const proformaInvoiceTemplateHTML = `
<div class="pi-wrapper">
    <h1>PROFORMA INVOICE</h1>

    <table class="pi-table" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <colgroup>
            <col style="width: 25%;">
            <col style="width: 15%;">
            <col style="width: 15%;">
            <col style="width: 10%;">
            <col style="width: 15%;">
            <col style="width: 20%;">
        </colgroup>
        <tbody>
            <!-- Header Section -->
            <tr>
                <td colspan="6" style="background-color: #f3f4f6; font-weight: bold; padding: 8px 8px 8px 15px; border: 1px solid #d1d5db; text-align: left; vertical-align: middle;">Proforma Invoice</td>
            </tr>
            <tr>
                <td colspan="6" style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;">
                    Date: <mark>[pi_date]</mark><br>
                    Proforma invoice : <mark>[pi_no]</mark>
                </td>
            </tr>

            <!-- SENT BY -->
            <tr>
                <td colspan="6" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; vertical-align: middle;">SENT BY</td>
            </tr>
            <tr>
                <td colspan="6" style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;">
                    Company Name: <mark>[seller_name]</mark><br>
                    Name/Department: <mark>[seller_human_name]</mark> / <mark>[seller_department]</mark><br>
                    Address: <mark>[seller_address]</mark><br>
                    City/Postal Code: <mark>[seller_city]</mark> / <mark>[seller_postal_code]</mark><br>
                    Country: <mark>[seller_country]</mark><br>
                    Tel./Fax No.: <mark>[seller_tel]</mark> / <mark>[seller_fax]</mark>
                </td>
            </tr>

            <!-- SENT TO & Bill of Lading No -->
            <tr>
                <td colspan="3" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; vertical-align: middle;">SENT TO</td>
                <td colspan="3" style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; vertical-align: middle;">Bill of Lading No</td>
            </tr>
            <tr>
                <td colspan="3" style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; height: 150px;">
                    Company Name: <mark>[buyer_name]</mark><br>
                    Name/Department: <mark>[buyer_human_name]</mark> / <mark>[buyer_human_department]</mark><br>
                    Address: <mark>[buyer_address]</mark><br>
                    City/Postal Code: <mark>[buyer_city]</mark> / <mark>[buyer_postal_code]</mark><br>
                    Country: <mark>[buyer_country]</mark><br>
                    Tel: <mark>[buyer_number]</mark>
                </td>
                <td colspan="3" style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;">
                    Number of pieces: <span data-field-id="total_quantity" class="data-field">[total_quantity]</span><br>
                    Total Gross Weight: <mark>[total_gross_weight]</mark><br>
                    Total Net Weight: <mark>[total_net_weight]</mark><br>
                    Carrier: <mark>[carrier]</mark>
                </td>
            </tr>

            <!-- Goods Header -->
            <tr>
                <td style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">Description of goods</td>
                <td style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">Commodity Code</td>
                <td style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">Country of origin</td>
                <td style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">Quantity</td>
                <td style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">Unit Value, Currency</td>
                <td style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center; vertical-align: middle;">Subtotal value, Currency</td>
            </tr>

            <!-- Goods Content: Data Row -->
            <tr>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;">
                    <span data-field-id="description" class="data-field">[description]</span>
                </td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;">
                    <span data-field-id="hscode" class="data-field">[hscode]</span>
                </td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;">
                    <span data-field-id="coo" class="data-field">[coo]</span>
                </td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;">
                    <span data-field-id="quantity" class="data-field">[quantity]</span>
                </td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: right;">
                    <span data-field-id="unit_price" class="data-field">[unit_price]</span> / <mark>[unit]</mark> <mark>[currency]</mark>
                </td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: right;">
                    <span data-field-id="sub_total_price" class="data-field">[sub_total_price]</span> / <mark>[currency]</mark>
                </td>
            </tr>

            <!-- Total Footer -->
            <tr style="background-color: #f0f0f0; font-weight: bold;">
                <td colspan="5" style="text-align: right; padding: 8px; border: 1px solid #d1d5db; vertical-align: middle;">Total value, currency</td>
                <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right; vertical-align: middle;">
                    <mark>[total_price]</mark> / <mark>[currency]</mark>
                </td>
            </tr>
        </tbody>
    </table>

    <!-- Footer Section (Outside Table) -->
    <div class="pi-footer" style="margin-top: 20px; padding: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="flex: 1;">Term of transportation: <mark>[transportation_term]</mark></div>
            <div style="flex: 1; text-align: center;">Reason for export: <mark>[export_reason]</mark></div>
            <div style="flex: 1;"></div>
        </div>

        <div style="margin-bottom: 40px;">
            I declare that the information mentioned above is true and correct to the best of my knowledge.
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px;">
            <div style="width: 45%;">Signature: </div>
            <div style="width: 45%; text-align: center;">Stamp:</div>
        </div>

        <div>
            Name: <mark>[seller_name]</mark>
        </div>
    </div>
</div>
`;
