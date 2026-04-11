import { LegalLayout } from "./LegalLayout";

const LegalNotice = () => (
  <LegalLayout title="Mentions Légales" lastUpdated="11 avril 2026">
    <h2>1. Éditeur de la Plateforme</h2>
    <ul>
      <li><strong>Raison sociale :</strong> New Wave Conception</li>
      <li><strong>Activité :</strong> Entreprise intégratrice de solutions web</li>
      <li><strong>Siège social :</strong> Abidjan, Côte d'Ivoire</li>
      <li><strong>Email de contact :</strong> disponible dans la section « Contact » de la Plateforme</li>
    </ul>

    <h2>2. Directeur de la publication</h2>
    <p>
      Le directeur de la publication est le représentant légal de New Wave Conception.
    </p>

    <h2>3. Hébergement</h2>
    <p>La Plateforme est hébergée par :</p>
    <ul>
      <li><strong>Infrastructure applicative :</strong> Vercel Inc. — San Francisco, États-Unis</li>
      <li><strong>Infrastructure de données :</strong> Amazon Web Services (AWS) — via notre partenaire technique</li>
    </ul>

    <h2>4. Propriété intellectuelle</h2>
    <p>
      L'ensemble du contenu de la Plateforme (textes, graphismes, logos, icônes, images, logiciels) est protégé par les lois relatives à la propriété intellectuelle. Le nom « RentFlow » et le logo associé sont des marques de SCI Binieba.
    </p>
    <p>
      Toute reproduction, représentation ou diffusion, totale ou partielle, du contenu de la Plateforme sans autorisation préalable et écrite est interdite.
    </p>

    <h2>5. Données personnelles</h2>
    <p>
      Le traitement des données personnelles est détaillé dans notre{" "}
      <a href="/privacy" className="text-primary hover:underline">Politique de Confidentialité</a>.
    </p>

    <h2>6. Cookies</h2>
    <p>
      La Plateforme utilise exclusivement des cookies techniques nécessaires à son fonctionnement (authentification, gestion de session, préférences d'affichage). Aucun cookie publicitaire ou analytique tiers n'est déposé.
    </p>

    <h2>7. Limitation de responsabilité</h2>
    <p>
      SCI Binieba s'efforce de fournir des informations fiables sur la Plateforme, mais ne garantit pas l'exactitude, la complétude ou l'actualité des informations diffusées. L'utilisation de la Plateforme se fait sous la responsabilité de l'utilisateur.
    </p>

    <h2>8. Liens hypertextes</h2>
    <p>
      La Plateforme peut contenir des liens vers des sites tiers. SCI Binieba décline toute responsabilité quant au contenu de ces sites externes.
    </p>

    <h2>9. Droit applicable</h2>
    <p>
      Les présentes mentions légales sont régies par le droit de la République de Côte d'Ivoire. Tout litige sera soumis à la compétence exclusive des tribunaux d'Abidjan.
    </p>
  </LegalLayout>
);

export default LegalNotice;
