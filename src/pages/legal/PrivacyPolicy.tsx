import { LegalLayout } from "./LegalLayout";

const PrivacyPolicy = () => (
  <LegalLayout title="Politique de Confidentialité" lastUpdated="11 avril 2026">
    <h2>1. Introduction</h2>
    <p>
      SCI Binieba, éditrice de la plateforme RentFlow, s'engage à protéger la vie privée de ses utilisateurs. La présente politique décrit comment nous collectons, utilisons, stockons et protégeons vos données personnelles.
    </p>

    <h2>2. Données collectées</h2>
    <h3>2.1 Données d'inscription</h3>
    <ul>
      <li>Nom complet, adresse email, numéro de téléphone</li>
      <li>Nom de l'organisation et informations légales (RCCM, adresse)</li>
    </ul>

    <h3>2.2 Données de gestion locative</h3>
    <ul>
      <li>Informations sur les biens immobiliers (adresse, type, unités)</li>
      <li>Informations sur les locataires (identité, coordonnées, contrats)</li>
      <li>Données financières (loyers, paiements, dépenses, quittances)</li>
      <li>Documents téléversés (contrats, pièces d'identité, justificatifs)</li>
    </ul>

    <h3>2.3 Données techniques</h3>
    <ul>
      <li>Adresse IP, type de navigateur, système d'exploitation</li>
      <li>Données de connexion et d'utilisation de la Plateforme</li>
    </ul>

    <h2>3. Finalités du traitement</h2>
    <p>Vos données sont traitées pour :</p>
    <ul>
      <li>Fournir et améliorer les services de gestion locative</li>
      <li>Gérer votre compte et votre abonnement</li>
      <li>Envoyer des notifications relatives à votre activité (rappels de loyer, alertes)</li>
      <li>Générer des documents (quittances, contrats, rapports financiers)</li>
      <li>Assurer la sécurité et prévenir la fraude</li>
      <li>Respecter nos obligations légales</li>
    </ul>

    <h2>4. Base légale</h2>
    <p>
      Le traitement de vos données repose sur l'exécution du contrat (fourniture du service SaaS), votre consentement (notifications), et nos intérêts légitimes (sécurité, amélioration du service).
    </p>

    <h2>5. Partage des données</h2>
    <p>Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées avec :</p>
    <ul>
      <li><strong>Hébergeurs et sous-traitants techniques</strong> — pour le stockage sécurisé et le fonctionnement de la Plateforme</li>
      <li><strong>Prestataires de services</strong> — pour l'envoi d'emails transactionnels</li>
      <li><strong>Autorités compétentes</strong> — sur demande légale ou judiciaire</li>
    </ul>

    <h2>6. Stockage et sécurité</h2>
    <p>
      Les données sont hébergées sur des serveurs sécurisés avec chiffrement en transit (TLS) et au repos. L'accès aux données est strictement limité au personnel autorisé. Des politiques de sécurité au niveau des lignes (RLS) garantissent l'isolation des données entre organisations.
    </p>

    <h2>7. Durée de conservation</h2>
    <ul>
      <li><strong>Données de compte</strong> — conservées tant que le compte est actif, puis supprimées dans un délai de 90 jours après résiliation</li>
      <li><strong>Données financières</strong> — conservées pendant 10 ans conformément aux obligations comptables</li>
      <li><strong>Logs techniques</strong> — conservés pendant 12 mois maximum</li>
    </ul>

    <h2>8. Vos droits</h2>
    <p>Conformément à la réglementation applicable, vous disposez des droits suivants :</p>
    <ul>
      <li><strong>Accès</strong> — obtenir une copie de vos données personnelles</li>
      <li><strong>Rectification</strong> — corriger des données inexactes ou incomplètes</li>
      <li><strong>Suppression</strong> — demander l'effacement de vos données</li>
      <li><strong>Portabilité</strong> — recevoir vos données dans un format structuré</li>
      <li><strong>Opposition</strong> — vous opposer au traitement de vos données</li>
    </ul>
    <p>
      Pour exercer ces droits, contactez-nous à l'adresse email indiquée dans la section « Contact » de la Plateforme.
    </p>

    <h2>9. Cookies</h2>
    <p>
      La Plateforme utilise uniquement des cookies essentiels au fonctionnement du service (authentification, préférences de session). Aucun cookie publicitaire ou de traçage n'est utilisé.
    </p>

    <h2>10. Modifications</h2>
    <p>
      Cette politique peut être mise à jour. Les utilisateurs seront informés de toute modification substantielle par notification dans la Plateforme ou par email.
    </p>
  </LegalLayout>
);

export default PrivacyPolicy;
