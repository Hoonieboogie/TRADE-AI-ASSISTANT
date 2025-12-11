export const saleContractTemplateHTML = `
<div class="sc-wrapper">
    <!-- Page 1: Specific Conditions -->
    <h1>Sale Contract</h1>

    <h2>Specific Conditions</h2>

    <p>
        The purpose of this contract is to stipulate the rights, obligations, and all matters of both parties necessary
        for <mark>[seller_name]</mark> (hereinafter referred to as seller) and <mark>[buyer_name]</mark> (hereinafter referred to as buyer) to sign the Overseas
        distribution contract for the distribution of the following goods. 'seller' and 'Buyer' are hereinafter
        referred to as "Parties to the Contract" or "Parties".
    </p>

    <table class="item-table" style="width: 100%; border-collapse: collapse;">
        <colgroup>
            <col style="width: 10%;">
            <col style="width: 35%;">
            <col style="width: 15%;">
            <col style="width: 15%;">
            <col style="width: 15%;">
            <col style="width: 10%;">
        </colgroup>
        <thead>
            <tr>
                <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Item No.</th>
                <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Commodity & Description</th>
                <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Quantity</th>
                <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Unit Price</th>
                <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Total</th>
                <th style="background-color: #f3f4f6; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: center;">Notice</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;"><mark>[item_no]</mark></td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;"><mark>[hscode]</mark>, <mark>[description]</mark></td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: center;"><mark>[quantity]</mark></td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: right;"><mark>[unit_price]</mark> / <mark>[unit]</mark> <mark>[currency]</mark></td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top; text-align: right;"><mark>[currency]</mark><mark>[sub_total_price]</mark></td>
                <td style="padding: 10px; border: 1px solid #d1d5db; vertical-align: top;"><mark>[notice]</mark></td>
            </tr>

            <tr>
                <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center; background-color: #f0f0f0; font-weight: bold;">TOTAL: </td>
                <td style="padding: 8px; border: 1px solid #d1d5db; background-color: #f0f0f0;"></td>
                <td style="padding: 8px; border: 1px solid #d1d5db; background-color: #f0f0f0;"></td>
                <td style="padding: 8px; border: 1px solid #d1d5db; background-color: #f0f0f0;"></td>
                <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right; background-color: #f0f0f0; font-weight: bold;"><mark>[currency]</mark><mark>[total_price]</mark></td>
                <td style="padding: 8px; border: 1px solid #d1d5db; background-color: #f0f0f0;"></td>
            </tr>
        </tbody>
    </table>

    <ul class="conditions">
        <li>Time of Shipment : <mark>[shipment_deadline]</mark><br>
            * Cancellation Date for Late Shipment : <mark>[shipment_cancellation_date]</mark></li>
        <li>Port of Shipment : <mark>[pol]</mark></li>
        <li>Port of Destination : <mark>[pod]</mark></li>
        <li>Partial Shipment : Allowed <span class="checkbox-widget" data-group="partial_shipment"></span>, Not Allowed <span class="checkbox-widget" data-group="partial_shipment"></span></li>
        <li>Transhipment : Allowed <span class="checkbox-widget" data-group="transhipment"></span>, Not Allowed <span class="checkbox-widget" data-group="transhipment"></span></li>
        <li>Delivery Terms : <mark>[incoterms]</mark><mark>[incoterms_port]</mark> Incoterms 2020</li>
        <li>Payment</li>
    </ul>

    <div class="payment-section" style="border: 1px solid #d1d5db; border-bottom: none;">
        <!-- L/C Section -->
        <div style="display: flex; border-bottom: 1px solid #d1d5db;">
            <div style="width: 20%; background-color: #f3f4f6; font-weight: bold; padding: 8px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #d1d5db;">
                Letter of Credit (L/C)
            </div>
            <div style="width: 80%;">
                <div style="display: flex; border-bottom: 1px solid #d1d5db;">
                    <div style="width: 25%; background-color: #f3f4f6; font-weight: bold; padding: 8px; border-right: 1px solid #d1d5db; display: flex; align-items: center;">Sight Credit</div>
                    <div style="width: 6.25%; padding: 8px; border-right: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center;"><span class="radio-circle" data-group="payment"></span></div>
                    <div style="width: 68.75%; padding: 8px; display: flex; align-items: center;">irrevocable documentary credit payable at sight</div>
                </div>
                <div style="display: flex; border-bottom: 1px solid #d1d5db;">
                    <div style="width: 25%; background-color: #f3f4f6; font-weight: bold; padding: 8px; border-right: 1px solid #d1d5db; display: flex; align-items: center;">Deferred Payment Credit</div>
                    <div style="width: 6.25%; padding: 8px; border-right: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center;"><span class="radio-circle" data-group="payment" data-linked-field="days_dpc"></span></div>
                    <div style="width: 68.75%; padding: 8px; display: flex; align-items: center;">irrevocable documentary credit with deferred payment at <mark>[days_dpc]</mark> days from B/L(AWB) date</div>
                </div>
                <div style="display: flex;">
                    <div style="width: 25%; background-color: #f3f4f6; font-weight: bold; padding: 8px; border-right: 1px solid #d1d5db; display: flex; align-items: center;">Acceptance Credit</div>
                    <div style="width: 6.25%; padding: 8px; border-right: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center;"><span class="radio-circle" data-group="payment" data-linked-field="days_ac"></span></div>
                    <div style="width: 68.75%; padding: 8px; display: flex; align-items: center;">irrevocable documentary credit with acceptance of drafts at <mark>[days_ac]</mark> days from B/L(AWB) date</div>
                </div>
            </div>
        </div>

        <!-- Documentary Collection Section -->
        <div style="display: flex; border-bottom: 1px solid #d1d5db;">
            <div style="width: 20%; background-color: #f3f4f6; font-weight: bold; padding: 8px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #d1d5db;">
                Documentary Collection
            </div>
            <div style="width: 80%;">
                <div style="display: flex; border-bottom: 1px solid #d1d5db;">
                    <div style="width: 25%; background-color: #f3f4f6; font-weight: bold; padding: 8px; border-right: 1px solid #d1d5db; display: flex; align-items: center;">D/P</div>
                    <div style="width: 6.25%; padding: 8px; border-right: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center;"><span class="radio-circle" data-group="payment"></span></div>
                    <div style="width: 68.75%; padding: 8px; display: flex; align-items: center;">documents against payment</div>
                </div>
                <div style="display: flex;">
                    <div style="width: 25%; background-color: #f3f4f6; font-weight: bold; padding: 8px; border-right: 1px solid #d1d5db; display: flex; align-items: center;">D/A</div>
                    <div style="width: 6.25%; padding: 8px; border-right: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center;"><span class="radio-circle" data-group="payment" data-linked-field="days_da"></span></div>
                    <div style="width: 68.75%; padding: 8px; display: flex; align-items: center;">documents against acceptance payable at <mark>[days_da]</mark> days from B/L(AWB) date</div>
                </div>
            </div>
        </div>

        <!-- T/T Section -->
        <div style="display: flex; border-bottom: 1px solid #d1d5db;">
            <div style="width: 20%; background-color: #f3f4f6; font-weight: bold; padding: 8px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #d1d5db;">
                T/T
            </div>
            <div style="width: 80%;">
                <div style="display: flex;">
                    <div style="width: 25%; background-color: #f3f4f6; font-weight: bold; padding: 8px; border-right: 1px solid #d1d5db; display: flex; align-items: center;">T/T</div>
                    <div style="width: 6.25%; padding: 8px; border-right: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center;"><span class="radio-circle" data-group="payment"></span></div>
                    <div style="width: 68.75%; padding: 8px; display: flex; align-items: center;">Telegraphic Transfer</div>
                </div>
            </div>
        </div>
    </div>

    <div style="margin-top: 20px;">
        <h2>General Terms and Conditions</h2>
        <p style="text-align: justify; margin-bottom: 20px;">Other detailed terms and conditions of this contract are
        specified in the following 'General Terms and Conditions'. 'seller' and 'buyer' agree to the main
        contracts and "General Terms and Conditions", and to prove the establishment of this contract, two copies of the
        contract shall be prepared, mutually signed, and each part shall keep one copy of contract.</p>

        <div class="general-conditions" style="font-size: 0.8em; color: #666;">
            <h3>1. [General]</h3>
            <p>These General Terms and Conditions are intended to be applied together with the Specific Conditions. In case
                of contradiction between these General Terms and Conditions and the Specific Conditions agreed between the
                parties, the Specific Conditions shall prevail.</p>

            <h3>2. [Sales Territory, Channel]</h3>
            <ol class="term-list" style="padding-left: 20px; margin: 0;">
                <li style="margin-bottom: 5px;">'seller' authorizes the sales right for distribution channel in <mark>[coo]</mark> to 'Buyer'</li>
                <li style="margin-bottom: 5px;">The sales permission area is designated as <mark>[coo]</mark> (hereinafter referred to as "region"), and
                    'Buyer' has the right to distribute and sell within the contract period.</li>
                <li style="margin-bottom: 5px;">'Buyer' can conduct general sales within the scope of authorized region when its sales</li>
                <li style="margin-bottom: 5px;">The buyer's sales channels are permitted only for this contract are as follows. In case of adding sales
                    channels, they can be added by mutual agreement.</li>
            </ol>
            <div style="margin-left: 20px; font-weight: bold; margin-top: 10px;">A. Sales Channels :</div>

            <h3>3. [Shipment]</h3>
            <ol class="term-list" style="padding-left: 20px; margin: 0;">
                <li style="margin-bottom: 5px;">The date of issuance of the bill of lading will be deemed to be the date of shipment unless the bill of
                    lading contains an on board notation indicating the date of shipment, in which case the date stated in
                    the on board notation will be deemed to be the date of shipment.</li>
                <li style="margin-bottom: 5px;">Partial shipment and/or transshipment shall be permitted unless otherwise stated in this Sales Contract.
                </li>
                <li style="margin-bottom: 5px;">The Seller shall not be responsible for any delay in shipment due to the Buyer's failure to provide
                    timely a documentary credit, as the case maybe, in conformity with this Sales Contract. The Seller shall
                    not be responsible for any damages incurred by the Buyer due to either delay in arrival of the ship
                    and/or airplane designated by the Buyer beyond the prearranged date of shipment.</li>
                <li style="margin-bottom: 5px;">If the parties agreed upon a cancellation date for late shipment in the Specific Conditions, the Buyer
                    may avoid the Sales Contract by notification to the Seller in case the shipment has not occurred by the
                    cancellation date.</li>
            </ol>

            <h3>4. [Packing and Marking]</h3>
            <ol class="term-list" style="padding-left: 20px; margin: 0;">
                <li style="margin-bottom: 5px;">Packing shall be performed at the Seller's option unless otherwise stated in this Sales Contract. In
                    case special instructions are necessary, the Buyer should provide the Seller with such instructions in a
                    timely manner. All the additional costs thereby incurred shall be borne by the Buyer.</li>
                <li style="margin-bottom: 5px;">Shipping Mark shall be made as shown in the Specific Conditions, if any.</li>
            </ol>

            <h3>5. [Insurance]</h3>
            <ol class="term-list" style="padding-left: 20px; margin: 0;">
                <li style="margin-bottom: 5px;">In case of CIF, 110% of the invoice amount shall be insured with insurance cover complying with the
                    Institute Cargo Clauses (C) or similar clause.</li>
                <li style="margin-bottom: 5px;">In case of CIP, 110% of the invoice amount shall be insured with insurance cover complying with the
                    Institute Cargo Clauses (A) or similar clause.</li>
            </ol>

            <h3>6. [Buyer's Obligation]</h3>
            <ol class="term-list" style="padding-left: 20px; margin: 0;">
                <li style="margin-bottom: 5px;">'Buyer' shall be responsible for sales account, advertisements, and sales promotions, and make best
                    efforts to maximize sales in region.</li>
                <li style="margin-bottom: 5px;">'Buyer' must obtain the permission from 'seller' when distributing articles related to permitted
                    product to use and produce promotional materials, regardless of form as online and offline banners,
                    catalogs, and pamphlets, etc.</li>
                <li style="margin-bottom: 5px;">'Buyer' has the right to select customers, sub-distributors or partners within the defined region.
                    However, before choosing a partner, share the partner's information with 'seller' in advance. All of
                    these customers, sub-distributors or partners are also required to comply with the entire contract.</li>
                <li style="margin-bottom: 5px;">'Buyer' shall investigate the complaints received by customers or business partners within the region
                    and shall discuss the relevant measures with 'seller'</li>
                <li style="margin-bottom: 5px;">'Buyer' shall not disclose and use any confidential products or information related to 'seller' to a
                    third party without prior written consent of 'seller', except for the obligation under this contract.
                    However, this is not limited to prices, discounts, conditions, periods or information that are directly
                    or indirectly transmitted from 'seller', or acquired in the process of trading with 'seller'.</li>
            </ol>

            <h3>7. [seller's Obligation]</h3>
            <ol class="term-list" style="padding-left: 20px; margin: 0;">
                <li style="margin-bottom: 5px;">'seller' shall support distributor's marketing activities. Especially, 'seller' shall make its best
                    effort to support the documentations for marketing. However, it is limited to approved data.</li>
                <li style="margin-bottom: 5px;">'seller' shall make its best effort to support the documentations for distribution and sales such as
                    product information, export customs clearance documents, import sales (including certification).</li>
                <li style="margin-bottom: 5px;">'seller' shall not infringe the authority of 'Buyer' in direct or indirect based on this contract,
                    through its employees, agents or other agencies or either on its own</li>
                <li style="margin-bottom: 5px;">In the case of changing specifications such as important raw materials or product design in 'seller',
                    'seller' shall notify 'Buyer' by e-mail or writing before 20 days prior to the expected application of
                    the change.</li>
            </ol>

            <h3>8. [Inspection]</h3>
            <ol class="term-list" style="padding-left: 20px; margin: 0;">
                <li style="margin-bottom: 5px;">The inspection of the Goods shall be done according to the export regulation of the Republic of Korea
                    and/or by the manufacturer(s), and such inspection shall be considered as final.</li>
                <li style="margin-bottom: 5px;">Should any specific inspector be designated by the Buyer, all additional charges incurred thereby shall
                    be borne by the Buyer and shall be added to the invoice amount, for which the documentary credit, if
                    any, shall be amended accordingly.</li>
            </ol>

            <h3>9. [Supply and Payment]</h3>
            <ol class="term-list" style="padding-left: 20px; margin: 0;">
                <li style="margin-bottom: 5px;">When ordering, 'Buyer' shall clarify information such as packing method, destination information, and
                    order quantity, etc.</li>
                <li style="margin-bottom: 5px;">'seller' shall notify to 'Buyer' the available quantity and delivery date within 3 business days from
                    the date the order is received.</li>
                <li style="margin-bottom: 5px;">If the parties have agreed on payment by a documentary credit, then, unless otherwise agreed, a
                    documentary credit in favor of the Seller shall be issued within [ ] days from the date of this Sales
                    Contract by a reputable bank, subject to the latest Uniform Customs and Practice for Documentary Credits
                    (UCP) of the International Chamber of Commerce. The amount of such credit shall be sufficient to cover
                    this contract amount.</li>
                <li style="margin-bottom: 5px;">If the parties have agreed on payment by a documentary collection, then, unless otherwise agreed, the
                    collection will be subject to the latest Uniform Rules for Collection (URC) of the International Chamber
                    of Commerce.
                    <ul class="sub-term-list" style="list-style-type: none; padding-left: 20px;">
                        <li>(a) In case of D/P, the Seller shall deliver a sight bill(s) of exchange drawn on the Buyer
                            together with the required documents to the Buyer through banks, and the Buyer shall effect the
                            payment immediately upon the first presentation of the bill(s) of exchange and the required
                            documents.</li>
                        <li>(b) In case of D/A, the Seller shall deliver a time bill(s) of exchange drawn on the Buyer
                            together with the required documents to the Buyer through banks, and the Buyer shall accept the
                            bill(s) of exchange immediately upon the first presentation of the bill(s) of exchange and the
                            required documents and shall effect the payment on the maturity date of the bill(s) of exchange.
                        </li>
                    </ul>
                </li>
                <li style="margin-bottom: 5px;">If the parties have agreed on payment by an open account, then, unless otherwise agreed, the Buyer shall
                    pay the invoice value of the goods to the Seller's account with the bank designated by the Seller by
                    means of telegraphic transfer (T/T) within the specified date under the Specific Conditions.</li>
                <li style="margin-bottom: 5px;">If the parties have agreed on payment by a payment in advance, then, unless otherwise agreed, the Buyer
                    shall pay the agreed amount to the Seller's account with the bank designated by the Seller by means of
                    telegraphic transfer (T/T) within the specified date under the Specific Conditions.</li>
                <li style="margin-bottom: 5px;">Payment is negotiable like <b>50% pre-deposit on the date of order (proforma invoice issuance date), and
                        balance the remaining 50% before shipment</b> to the bank account designated by 'seller' as T/T.
                    The prices for products follow in accordance with the supply price agreed in advance.</li>
            </ol>

            <h3>10. [Warranty]</h3>
            <p>① The Goods shall conform to the specification (and/or description) set forth in this Sales Contract, and
                shall be of good material &amp; workmanship and free from any defect for at least【 】months from the date of
                shipment.</p>
            <p>② The extent of the Seller's liability under this warranty shall be limited to the repair or replacement as
                herein provided of any defective goods or parts thereof. However, this warranty does not extend to any of
                the said goods which have been : (a) subjected to misuse, neglect, accident or abuse, (b) improperly
                repaired, installed, transported, altered or modified in any way by any other party than Seller or (c) used
                in violation of instructions furnished by the Seller.</p>
            <p>③ Except for the express limited warranties set forth in this article, the Seller makes no other warranty to
                the Buyer, express or implied, and herby expressly disclaims any warranty of merchantability or fitness for
                a particular purpose. In no event shall the Seller be liable to the Buyer under this Sales Contract or
                otherwise for any lost profits or for indirect, incidental or consequential damages for any reason.</p>

            <h3>11. [Claims]</h3>
            <p>① Any claim by the Buyer of whatever nature arising under this Sales Contract shall be made by facsimile,
                cable, or e-mail within 【 】days after arrival of the goods at the destination specified in the bills of
                lading (or airway bill, sea waybill). Full particulars of such claim shall be made in writing, and forwarded
                by registered mail to the Seller within 【 】days after such fax, cabling, or e-mailing.</p>
            <p>② The Buyer must submit with particulars the inspection report sworn by a reputable surveyor acceptable to
                the Seller when the quality or quantity of the goods delivered is in dispute. Failure to make such claim
                within such period shall constitute acceptance of shipment and agreement of Buyer that such shipment fully
                complies with applicable terms and conditions.</p>

            <h3>12. [Remedy]</h3>
            <p>① The Buyer shall, without limitation, be in default of this Sales Contract, if the Buyer shall become
                insolvent, bankrupt or fail to make any payment to the Seller including the establishment of the documentary
                credit within the due date.</p>
            <p>② In case of the Buyer's default, Seller may, without prior notice thereof to the Buyer, exercise any of the
                following remedies among others :</p>
            <p>(a) terminate this Sales Contract;</p>
            <p>(b) terminate this Sales Contract as to the portion of the goods in default only, and resell them to recover
                from Buyer the difference between the price set forth in this Sales Contract and the price obtained upon
                resale, plus any incidental loss or expense; or</p>
            <p>(c) terminate this Sales Contract as to any unshipped balance and recover from the Buyer as liquidated
                damages, a sum of 【 】percent of the price of the unshipped balance.</p>
            <p>③ The rights and remedies herein reserved to the Seller shall be cumulative and in addition to any other or
                further rights and remedies available at law.</p>

            <h3>13. [Force Majeure]</h3>
            <p>A party shall not be liable for a failure to perform any of his obligations herein if he proves that the
                failure was due to an impediment beyond his control such as prohibition of exportation, suspension of
                issuance of export license or other government restriction, act of God, war, blockade, revolution,
                insurrection, mobilization, strike, lockout or any labor dispute, civil commotion, riot, plague or other
                epidemic, fire, typhoon, flood, etc, and that he proves that he could not reasonably be expected to have
                taken the impediment into account at the time of the conclusion of this Sales Contract or to have avoided or
                overcome its</p>

            <h3>14. [Patents, Trade Marks, Designs, etc.]</h3>
            <h4>① The Buyer acknowledges and agrees that:</h4>
            <p>(a) any and all the Seller's intellectual property rights are the sole and exclusive property of the Seller
                or its licensors;</p>
            <p>(b) the Buyer shall not acquire any ownership interest in any of the Seller's intellectual property rights
                under this Sales Contract;</p>
            <p>(c) any goodwill derived from the use by the Buyer of the Seller's intellectual property rights inures to the
                benefit of the Seller or its licensors, as the case may be;</p>
            <p>(d) if the Buyer acquires any intellectual property rights, rights in or relating to any Goods (including any
                rights in any trademarks, derivative works or patent improvements relating thereto) by operation of law, or
                otherwise, such rights are deemed to be the property of and are hereby irrevocably assigned to the Seller or
                its licensors, as the case may be, without further action by either of the parties; and</p>
            <p>(e) the Buyer shall use the Seller's intellectual property rights solely for purposes of using the goods
                under this Sales Contract and only in accordance with this Sales Contract and the instructions of the
                Seller.</p>
            <h4>② The Buyer shall not:</h4>
            <p>(a) take any action that interferes with any of the Seller's rights in or to the Seller's intellectual
                property rights, including the Seller's ownership or exercise thereof;</p>
            <p>(b) challenge any right, title or interest of Seller in or to the Seller's intellectual property rights;</p>
            <p>(c) make any claim or take any action adverse to the Seller's ownership of the Seller's intellectual property
                rights;</p>
            <p>(d) register or apply for registrations, anywhere in the world, for the Seller's trademarks or any other
                trademark that is similar to the Seller's trademarks or that incorporates the Seller's trademarks;</p>
            <p>(e) use any mark, anywhere that is confusingly similar to the Seller's trademarks;</p>
            <p>(f) engage in any action that tends to disparage, dilute the value of, or reflect negatively on the goods or
                any of the Seller's trademarks;</p>
            <p>(g) misappropriate any of the Seller's trademarks for use as a domain name without prior written consent from
                the Seller; or</p>
            <p>(h) alter, obscure or remove any of the Seller's trademark(s), copyright notices or any other proprietary
                rights notices placed on the goods, marketing materials or other materials that the Seller may provide.</p>

            <h3>15. [Confidentiality]</h3>
            <p>Not only the duration of the contract, but also for one year after the expiration of the contract maintenance
                period, according to this contract, 'Buyer' must not divulge any information of product-related technology,
                commercial information, pricing structure, data, sales, marketing, distribution, projects, plans,
                management, etc. The violation of this confidentiality obligation constitutes the serious breach of this
                contract.</p>

            <h3>16. [Governing Law]</h3>
            <p>All matters arising out of or relating to this Sales Contract are governed by and construed in accordance
                with the laws of Republic of Korea.</p>

            <h3>17. [Arbitration]</h3>
            <p>Any dispute arising out of or in connection with this Sales Contract shall be finally settled by arbitration
                in Seoul in accordance with the International Arbitration Rules of the Korean Commercial Arbitration Board
                and laws of Korea.</p>

            <h3>18. [Trade Terms]</h3>
            <p>All delivery terms provided in the Contract shall be interpreted in accordance with the latest Incoterms of
                International Chamber of Commerce.</p>
        </div>
    </div>

    <div style="margin-top: 40px; margin-bottom: 40px;">
        <p><mark>[contract_date]</mark></p>
    </div>

    <div class="signatures" style="display: flex; justify-content: space-between; margin-bottom: 60px;">
        <div style="width: 45%;">
            <p style="margin-bottom: 20px;">seller: <mark>[seller_name]</mark></p>
            <div style="display: flex; margin-bottom: 5px;">
                <span style="width: 80px;">Address:</span>
                <span><mark>[seller_address]</mark>, <mark>[seller_city]</mark>,<br><mark>[seller_country]</mark></span>
            </div>
            <div style="margin-top: 30px;">
                CEO: <mark>[seller_ceo]</mark> (sign)
            </div>
        </div>
        <div style="width: 45%;">
            <p style="margin-bottom: 20px;">Buyer: <mark>[buyer_name]</mark></p>
            <div style="display: flex; margin-bottom: 5px;">
                <span style="width: 80px;">Address:</span>
                <span><mark>[buyer_address]</mark>, <mark>[buyer_city]</mark>,<br><mark>[buyer_country]</mark></span>
            </div>
            <div style="margin-top: 30px;">
                CEO: <mark>[buyer_ceo]</mark> (sign)
            </div>
        </div>
    </div>

    <h2 style="text-align: center; text-decoration: underline; margin-bottom: 30px;">Appendix</h2>

    <div class="appendix-content">
        <p style="margin-bottom: 10px;">1. Product : <mark>[description]</mark></p>
        <p style="margin-bottom: 10px;">2. Supply Price: <mark>[currency]</mark> <mark>[unit_price]</mark>/<mark>[unit]</mark> <mark>[incoterms]</mark> <mark>[incoterms_port]</mark> incoterms2020</p>
        <p style="margin-bottom: 10px;">3. Total Order & Quantity: <mark>[quantity]</mark></p>
        <p style="margin-bottom: 10px;">4. Lead Time : <mark>[lead_time]</mark></p>
    </div>
</div>
`;
