export const packingListTemplateHTML = `
<div class="pl-wrapper">
    <h1>PACKING LIST</h1>
    <div class="title-underline"></div>

    <table class="header-table" style="width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #000; margin-bottom: 20px;">
        <colgroup>
            <col style="width: 50%;">
            <col style="width: 50%;">
        </colgroup>
        <!-- Row 1 -->
        <tr>
            <td style="width: 50%; border: 1px solid #000; padding: 5px; word-break: break-all;" rowspan="2">
                Date: <mark>[pl_date]</mark><br>
                Invoice No.: <mark>[invoice_no]</mark><br>
                Ref No.: <mark>[ref_no]</mark>
            </td>
            <td style="width: 50%; border: 1px solid #000; padding: 5px; word-break: break-all;">
                <span class="label" style="display: block; font-size: 0.8em; color: #666;">No. & Date of Invoice</span>
                <mark>[pl_no]</mark> / <mark>[pl_date]</mark>
            </td>
        </tr>
        <!-- Row 2 -->
        <tr>
            <td style="border: 1px solid #000; padding: 5px; word-break: break-all;">
                <span class="label" style="display: block; font-size: 0.8em; color: #666;">No. & Date of L/C</span>
                <mark>[l/c_no]</mark> / <mark>[l/c_date]</mark>
            </td>
        </tr>
        <!-- Row 3 -->
        <tr>
            <td style="height: 50px; border: 1px solid #000; padding: 5px; word-break: break-all;">
                <span class="label" style="display: block; font-size: 0.8em; color: #666;">For Account & Risk of Messrs.</span>
                <mark>[buyer_name]</mark><br>
                <mark>[buyer_address]</mark>
            </td>
            <td style="border: 1px solid #000; padding: 5px; word-break: break-all;">
                <span class="label" style="display: block; font-size: 0.8em; color: #666;">Remarks</span>
                <mark>[remarks]</mark>
            </td>
        </tr>
        <!-- Row 4 -->
        <tr>
            <td style="height: 50px; border: 1px solid #000; padding: 5px; word-break: break-all;">
                <span class="label" style="display: block; font-size: 0.8em; color: #666;">Notify party</span>
                <mark>[pl_notify_party]</mark><br>
                <mark>[pl_notify_party_address]</mark>
            </td>
            <td rowspan="3" style="border: 1px solid #000;"></td> <!-- Empty right column for remaining rows -->
        </tr>
        <!-- Row 5: Split Left Column -->
        <tr>
            <td style="padding: 0; height: 50px; border: 1px solid #000;">
                <table style="width: 100%; height: 100%; table-layout: fixed; border: none; border-collapse: collapse;">
                    <colgroup>
                        <col style="width: 50%;">
                        <col style="width: 50%;">
                    </colgroup>
                    <tr>
                        <td style="width: 50%; border: none; border-right: 1px solid #000; padding: 5px; word-break: break-all;">
                            <span class="label" style="display: block; font-size: 0.8em; color: #666;">Port of loading</span>
                            <mark>[pol]</mark>
                        </td>
                        <td style="width: 50%; border: none; padding: 5px; word-break: break-all;">
                            Port of Loading: <mark>[port_of_loading]</mark><br>
                            Final Destination: <mark>[final_destination]</mark><br>
                            Carrier: <mark>[carrier]</mark><br>
                            Sailing on or about: <mark>[sailing_date]</mark><br>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <!-- Row 6: Split Left Column -->
        <tr>
            <td style="padding: 0; height: 50px; border: 1px solid #000;">
                <table style="width: 100%; height: 100%; table-layout: fixed; border: none; border-collapse: collapse;">
                    <colgroup>
                        <col style="width: 50%;">
                        <col style="width: 50%;">
                    </colgroup>
                    <tr>
                        <td style="width: 50%; border: none; border-right: 1px solid #000; padding: 5px; word-break: break-all;">
                            <span class="label" style="display: block; font-size: 0.8em; color: #666;">Carrier</span>
                            <mark>[carrier]</mark>
                        </td>
                        <td style="width: 50%; border: none; padding: 5px; word-break: break-all;">
                            <span class="label" style="display: block; font-size: 0.8em; color: #666;">Sailing on or about</span>
                            <mark>[shipment_deadline]</mark>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <table class="items-table" style="width: 100%; table-layout: fixed; border-collapse: collapse;">
        <colgroup>
            <col style="width: 30%;">
            <col style="width: 35%;">
            <col style="width: 8%;">
            <col style="width: 9%;">
            <col style="width: 9%;">
            <col style="width: 9%;">
        </colgroup>
        <thead>
            <tr>
                <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Marks and Number of PKGS</th>
                <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Description of Goods</th>
                <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Q'ty</th>
                <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Net Weight</th>
                <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Gross Weight</th>
                <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Measurement</th>
            </tr>
        </thead>
        <tbody>
            <!-- 20 Empty Rows -->
            <tr style="height: 400px;">
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;"><mark>[marks_and_numbers]</mark></td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;"><mark>[description]</mark></td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;"><mark>[quantity]</mark></td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;"><mark>[net_weight]</mark> KG</td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;"><mark>[gross_weight]</mark> KG</td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;"><mark>[measurement]</mark> CBM</td>
            </tr>
            <tr style="background-color: #f0f0f0; font-weight: bold;">
                <td colspan="2" style="text-align: right; padding: 8px; border: 1px solid #d1d5db;">TOTAL :</td>
                <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;"><mark>[quantity]</mark></td>
                <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;"><mark>[total_net_weight]</mark></td>
                <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;"><mark>[total_gross_weight]</mark></td>
                <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;"><mark>[total_measurement]</mark></td>
            </tr>
        </tbody>
    </table>

    <div class="signature" style="margin-top: 40px; text-align: right;">
        <mark>[seller_name]</mark>
        <br><br><br>
        <div style="border-top: 1px solid #000; display: inline-block; padding-top: 5px;">Authorized Signature</div>
    </div>
</div>
`;
