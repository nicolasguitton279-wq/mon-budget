import { supabase } from './client';

export type CompteSupabase = {
  id: string;
  user_id: string;
  nom: string;
  solde: number;
};

export type PrelevementSupabase = {
  id: string;
  user_id: string;
  nom: string;
  montant: number;
  jour_prelevement: number | null;
  paye: boolean;
  recurrent: boolean;
  mois: string;
};

export type DepenseSupabase = {
  id: string;
  user_id: string;
  nom: string;
  montant: number;
  categorie: string;
  date_depense: string;
};

async function recupererUtilisateur() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(
      `Impossible de vérifier l'utilisateur : ${error.message}`
    );
  }

  if (!user) {
    throw new Error('Aucun utilisateur connecté.');
  }

  return user;
}

export async function chargerOuCreerCompte() {
  const user = await recupererUtilisateur();

  const { data: compteExistant, error: erreurLecture } =
    await supabase
      .from('comptes')
      .select('id, user_id, nom, solde')
      .eq('user_id', user.id)
      .eq('nom', 'Compte courant')
      .maybeSingle();

  if (erreurLecture) {
    throw new Error(
      `Impossible de charger le compte : ${erreurLecture.message}`
    );
  }

  if (compteExistant) {
    return {
      ...compteExistant,
      solde: Number(compteExistant.solde),
    } as CompteSupabase;
  }

  const { data: nouveauCompte, error: erreurCreation } =
    await supabase
      .from('comptes')
      .insert({
        user_id: user.id,
        nom: 'Compte courant',
        solde: 3500,
      })
      .select('id, user_id, nom, solde')
      .single();

  if (erreurCreation) {
    throw new Error(
      `Impossible de créer le compte : ${erreurCreation.message}`
    );
  }

  return {
    ...nouveauCompte,
    solde: Number(nouveauCompte.solde),
  } as CompteSupabase;
}

export async function modifierSoldeCompte(
  compteId: string,
  nouveauSolde: number
) {
  if (!Number.isFinite(nouveauSolde)) {
    throw new Error('Le solde indiqué est incorrect.');
  }

  const { error } = await supabase
    .from('comptes')
    .update({
      solde: nouveauSolde,
    })
    .eq('id', compteId);

  if (error) {
    throw new Error(
      `Impossible de modifier le solde : ${error.message}`
    );
  }
}

export async function chargerPrelevements() {
  const user = await recupererUtilisateur();

  const debutMois = new Date();
  debutMois.setDate(1);

  const mois = [
    debutMois.getFullYear(),
    String(debutMois.getMonth() + 1).padStart(2, '0'),
    '01',
  ].join('-');

  const { data, error } = await supabase
    .from('prelevements')
    .select(
      'id, user_id, nom, montant, jour_prelevement, paye, recurrent, mois'
    )
    .eq('user_id', user.id)
    .eq('mois', mois)
    .order('jour_prelevement', {
      ascending: true,
      nullsFirst: false,
    });

  if (error) {
    throw new Error(
      `Impossible de charger les prélèvements : ${error.message}`
    );
  }

  return (data ?? []).map((prelevement) => ({
    ...prelevement,
    montant: Number(prelevement.montant),
  })) as PrelevementSupabase[];
}

export async function ajouterPrelevement(
  nom: string,
  montant: number,
  jourPrelevement: number | null
) {
  const user = await recupererUtilisateur();

  const nomNettoye = nom.trim();

  if (!nomNettoye) {
    throw new Error('Le nom du prélèvement est obligatoire.');
  }

  if (!Number.isFinite(montant) || montant <= 0) {
    throw new Error(
      'Le montant du prélèvement doit être supérieur à zéro.'
    );
  }

  if (
    jourPrelevement !== null &&
    (jourPrelevement < 1 || jourPrelevement > 31)
  ) {
    throw new Error(
      'Le jour du prélèvement doit être compris entre 1 et 31.'
    );
  }

  const maintenant = new Date();

  const mois = [
    maintenant.getFullYear(),
    String(maintenant.getMonth() + 1).padStart(2, '0'),
    '01',
  ].join('-');

  const { data, error } = await supabase
    .from('prelevements')
    .insert({
      user_id: user.id,
      nom: nomNettoye,
      montant,
      jour_prelevement: jourPrelevement,
      paye: false,
      recurrent: true,
      mois,
    })
    .select(
      'id, user_id, nom, montant, jour_prelevement, paye, recurrent, mois'
    )
    .single();

  if (error) {
    throw new Error(
      `Impossible d'ajouter le prélèvement : ${error.message}`
    );
  }

  return {
    ...data,
    montant: Number(data.montant),
  } as PrelevementSupabase;
}

export async function modifierStatutPrelevement(
  prelevementId: string,
  paye: boolean
) {
  const { error } = await supabase
    .from('prelevements')
    .update({
      paye,
    })
    .eq('id', prelevementId);

  if (error) {
    throw new Error(
      `Impossible de modifier le prélèvement : ${error.message}`
    );
  }
}

export async function supprimerPrelevement(
  prelevementId: string
) {
  const { error } = await supabase
    .from('prelevements')
    .delete()
    .eq('id', prelevementId);

  if (error) {
    throw new Error(
      `Impossible de supprimer le prélèvement : ${error.message}`
    );
  }
}

export async function chargerDepenses() {
  const user = await recupererUtilisateur();

  const debutMois = new Date();
  debutMois.setDate(1);

  const finMois = new Date(
    debutMois.getFullYear(),
    debutMois.getMonth() + 1,
    0
  );

  const dateDebut = [
    debutMois.getFullYear(),
    String(debutMois.getMonth() + 1).padStart(2, '0'),
    '01',
  ].join('-');

  const dateFin = [
    finMois.getFullYear(),
    String(finMois.getMonth() + 1).padStart(2, '0'),
    String(finMois.getDate()).padStart(2, '0'),
  ].join('-');

  const { data, error } = await supabase
    .from('depenses')
    .select(
      'id, user_id, nom, montant, categorie, date_depense'
    )
    .eq('user_id', user.id)
    .gte('date_depense', dateDebut)
    .lte('date_depense', dateFin)
    .order('date_depense', {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Impossible de charger les dépenses : ${error.message}`
    );
  }

  return (data ?? []).map((depense) => ({
    ...depense,
    montant: Number(depense.montant),
  })) as DepenseSupabase[];
}

export async function ajouterDepenseSupabase(
  nom: string,
  montant: number,
  categorie = 'Autre'
) {
  const user = await recupererUtilisateur();

  const nomNettoye = nom.trim();

  if (!nomNettoye) {
    throw new Error('Le nom de la dépense est obligatoire.');
  }

  if (!Number.isFinite(montant) || montant <= 0) {
    throw new Error(
      'Le montant de la dépense doit être supérieur à zéro.'
    );
  }

  const { data, error } = await supabase
    .from('depenses')
    .insert({
      user_id: user.id,
      nom: nomNettoye,
      montant,
      categorie,
      date_depense: new Date().toISOString().slice(0, 10),
    })
    .select(
      'id, user_id, nom, montant, categorie, date_depense'
    )
    .single();

  if (error) {
    throw new Error(
      `Impossible d'ajouter la dépense : ${error.message}`
    );
  }

  return {
    ...data,
    montant: Number(data.montant),
  } as DepenseSupabase;
}

export async function supprimerDepenseSupabase(
  depenseId: string
) {
  const { error } = await supabase
    .from('depenses')
    .delete()
    .eq('id', depenseId);

  if (error) {
    throw new Error(
      `Impossible de supprimer la dépense : ${error.message}`
    );
  }
}