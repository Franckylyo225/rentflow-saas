
UPDATE contract_templates
SET content = '<h1 style="text-align: center;">CONTRAT DE BAIL À USAGE D''HABITATION</h1>

<p>&nbsp;</p>

<p>Entre les soussignés :</p>

<p><strong>Le Bailleur :</strong><br>
{{agency_name}}<br>
Téléphone : —</p>

<p><strong>ET</strong></p>

<p><strong>Le Locataire :</strong><br>
{{tenant_name}}<br>
Téléphone : {{tenant_phone}}</p>

<p>&nbsp;</p>

<h2>ARTICLE 1 : OBJET DU CONTRAT</h2>
<p>Le présent contrat a pour objet la location d''un bien immobilier :<br>
Bien : {{property_name}}<br>
Unité : {{unit_name}}</p>

<h2>ARTICLE 2 : DURÉE</h2>
<p>Le présent bail est consenti à compter du <strong>{{start_date}}</strong> et prenant fin le <strong>{{end_date}}</strong>.</p>

<h2>ARTICLE 3 : LOYER</h2>
<p>Le loyer mensuel est fixé à :<br>
<strong>{{rent_amount}} FCFA</strong></p>

<h2>ARTICLE 4 : DÉPÔT DE GARANTIE</h2>
<p>Le locataire verse un dépôt de garantie selon les conditions convenues entre les parties.</p>

<h2>ARTICLE 5 : CHARGES</h2>
<p>Les charges (eau, électricité, etc.) sont :<br>
☐ Incluses<br>
☐ À la charge du locataire</p>

<h2>ARTICLE 6 : OBLIGATIONS DU LOCATAIRE</h2>
<p>Le locataire s''engage à :</p>
<ul>
<li>Payer le loyer à échéance</li>
<li>Utiliser le bien en bon père de famille</li>
<li>Ne pas sous-louer sans autorisation</li>
</ul>

<h2>ARTICLE 7 : OBLIGATIONS DU BAILLEUR</h2>
<p>Le bailleur s''engage à :</p>
<ul>
<li>Fournir un logement décent</li>
<li>Assurer la jouissance paisible du bien</li>
</ul>

<h2>ARTICLE 8 : RÉSILIATION</h2>
<p>Le contrat peut être résilié par l''une des parties avec un préavis conforme à la réglementation en vigueur.</p>

<h2>ARTICLE 9 : LITIGES</h2>
<p>Tout litige sera réglé à l''amiable ou porté devant les juridictions compétentes de Côte d''Ivoire.</p>

<p>&nbsp;</p>

<table style="width: 100%;">
<tr>
<td style="width: 50%; text-align: center; padding: 20px;">
<p><strong>Le Bailleur</strong></p>
<p>(Signature)</p>
</td>
<td style="width: 50%; text-align: center; padding: 20px;">
<p><strong>Le Locataire</strong></p>
<p>(Signature)</p>
</td>
</tr>
</table>',
updated_at = now()
WHERE template_type = 'individual';
