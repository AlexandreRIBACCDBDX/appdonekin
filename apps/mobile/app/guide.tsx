import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { PopupScreen } from '@/components/features/PopupScreen';
import { useTheme } from '@/hooks/useTheme';

export default function GuideScreen() {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <PopupScreen title="Comment fonctionne DoneKin">
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Concept label="Le cercle" value="Ta famille, en ligne" />
        <Concept label="Le Done" value="La monnaie du cercle" />
      </View>
      <Concept label="Le solde" value="Ton portefeuille" full />

      <Section eyebrow="Gagner des Dones" title="Chaque tâche a un prix">
        <P>
          Une tâche est toujours assignée à quelqu'un, et vaut un nombre de Dones fixé à la création. Ce qui se
          passe ensuite dépend d'une seule question : pour qui est-elle créée ?
        </P>
        <H4>Une tâche pour toi-même</H4>
        <P>
          Elle vaut automatiquement 0,5 Done — le montant choisi à la création n'est pas retenu. Elle se valide
          toute seule dès que tu la marques faite : personne d'autre n'a besoin de confirmer.
        </P>
        <H4>Une tâche pour quelqu'un d'autre</H4>
        <P>
          Là, tu choisis librement combien elle vaut. Mais elle ne paie qu'une fois que la personne qui l'a créée
          confirme qu'elle est bien faite — jamais automatiquement, même pour un admin du cercle.
        </P>
        <H4>Fait à plusieurs ? Les Dones se partagent</H4>
        <P>
          Au moment de marquer une tâche faite, tu peux indiquer que quelqu'un t'a aidé. Les Dones se répartissent
          alors à parts égales entre toi et chaque personne qui a aidé — uniquement pour une tâche sans projet, qui
          n'est pas déjà versée à une cagnotte commune.
        </P>
        <Callout>
          En retard, ça coûte : une tâche non faite après sa date limite retire 2 Dones par jour de retard au
          portefeuille personnel, dès qu'elle est validée.
        </Callout>
      </Section>

      <Section eyebrow="Les objectifs communs" title="Un projet, c'est une cagnotte à deux robinets">
        <P>
          Un projet a toujours un objectif en Dones à atteindre. Contrairement à une tâche, ses points ne vont à
          personne en particulier — ils remplissent une cagnotte commune, que deux mécanismes peuvent alimenter en
          même temps.
        </P>
        <H4>Automatiquement, par les tâches</H4>
        <P>
          Si une tâche est rattachée à un projet, ses Dones ne vont jamais dans le portefeuille de celui qui l'a
          faite — ils vont directement dans la cagnotte du projet.
        </P>
        <H4>Volontairement, avec son propre wallet</H4>
        <P>
          N'importe quel membre du cercle peut aussi payer de sa poche : depuis la fiche du projet, « Contribuer
          avec mon wallet » retire des Dones de son solde personnel pour les ajouter à la cagnotte.
        </P>
      </Section>

      <Section eyebrow="Du lancement à la clôture" title="Le cycle de vie d'un projet">
        <Step n={1} title="Création — objectif obligatoire">
          Le créateur fixe le titre et l'objectif en Dones à atteindre — obligatoire. Il peut aussi ajouter un
          engagement personnel facultatif (« promesse »).
        </Step>
        <Step n={2} title="La cagnotte se remplit">
          Par les tâches rattachées au projet, et par les contributions volontaires de n'importe qui — les deux à
          la fois.
        </Step>
        <Step n={3} title="Suivre la progression">
          La fiche du projet affiche la cagnotte face à l'objectif, en Dones et en pourcentage, visible par tout le
          cercle.
        </Step>
        <Step n={4} title="Objectif atteint">
          Le projet devient clôturable — par son créateur ou un admin du cercle, jamais avant.
        </Step>
        <Step n={5} title="Clôture et bonus" last>
          Chaque participant reçoit +5 Dones. Si une promesse avait été prise, les autres membres votent — si les
          confirmations l'emportent, le créateur reçoit +10 Dones de plus. Le projet passe en « Terminé ».
        </Step>
      </Section>

      <Section eyebrow="Dépenser ses Dones" title="Récompenses et partages">
        <P>
          Une récompense a un coût fixe en Dones — la débloquer retire ce coût du portefeuille personnel, parfois
          avec une validation à obtenir avant.
        </P>
        <P>
          Partager des points transfère des Dones du solde d'un membre vers celui d'un autre, directement — utile
          pour dire merci sans créer de tâche.
        </P>
      </Section>

      <Section eyebrow="Les enfants sans téléphone" title="Un profil géré, jamais un profil oublié">
        <P>
          Un membre n'a pas besoin d'un compte ni d'un téléphone pour exister dans DoneKin. Un enfant sans appareil
          a son propre profil, son propre solde, ses propres tâches — géré par un parent responsable qui peut créer
          ses tâches, valider ce qu'il a terminé, changer sa photo, et suivre son solde depuis l'écran d'accueil, à
          côté du sien.
        </P>
      </Section>
    </PopupScreen>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
        {eyebrow}
      </Text>
      <Text style={[typography.heading, { color: colors.textPrimary }]}>{title}</Text>
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );
}

function P({ children }: { children: ReactNode }) {
  const { colors, typography } = useTheme();
  return <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 21 }]}>{children}</Text>;
}

function H4({ children }: { children: ReactNode }) {
  const { colors, typography } = useTheme();
  return <Text style={[typography.label, { color: colors.textPrimary, marginTop: 4 }]}>{children}</Text>;
}

function Callout({ children }: { children: ReactNode }) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.donesMuted,
        borderRadius: radius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={[typography.caption, { color: colors.dones }]}>{children}</Text>
    </View>
  );
}

function Concept({ label, value, full }: { label: string; value: string; full?: boolean }) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View
      style={{
        flex: full ? undefined : 1,
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: 2,
      }}
    >
      <Text style={{ color: colors.dones, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function Step({ n, title, children, last }: { n: number; title: string; children: ReactNode; last?: boolean }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, paddingBottom: last ? 0 : spacing.md }}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
          }}
        >
          <Text style={{ color: colors.textOnPrimary, fontWeight: '800', fontSize: 12 }}>{n}</Text>
        </View>
        {!last ? <View style={{ flex: 1, width: 1, backgroundColor: colors.border, marginTop: 4 }} /> : null}
      </View>
      <View style={{ flex: 1, gap: 4, paddingBottom: spacing.sm }}>
        <Text style={[typography.label, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>{children}</Text>
      </View>
    </View>
  );
}
