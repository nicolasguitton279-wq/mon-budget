'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/client';

import {
  ajouterDepenseSupabase,
  ajouterPrelevement,
  chargerDepenses,
  chargerOuCreerCompte,
  chargerPrelevements,
  modifierSoldeCompte,
  modifierStatutPrelevement,
  supprimerDepenseSupabase,
  supprimerPrelevement,
  type DepenseSupabase,
  type PrelevementSupabase,
} from '../utils/budget';

export default function Home() {
  const router = useRouter();

  const [sessionVerifiee, setSessionVerifiee] = useState(false);
  const [donneesChargees, setDonneesChargees] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [actionEnCours, setActionEnCours] = useState(false);

  const [compteId, setCompteId] = useState('');
  const [solde, setSolde] = useState('0');

  const [prelevements, setPrelevements] = useState<
    PrelevementSupabase[]
  >([]);

  const [depenses, setDepenses] = useState<
    DepenseSupabase[]
  >([]);

  const [afficherFormulaireDepense, setAfficherFormulaireDepense] =
    useState(false);

  const [
    afficherFormulairePrelevement,
    setAfficherFormulairePrelevement,
  ] = useState(false);

  const [nomDepense, setNomDepense] = useState('');
  const [montantDepense, setMontantDepense] = useState('');

  const [nomPrelevement, setNomPrelevement] = useState('');
  const [montantPrelevement, setMontantPrelevement] =
    useState('');
  const [jourPrelevement, setJourPrelevement] = useState('');

  const [messageErreur, setMessageErreur] = useState('');
  const [messageSucces, setMessageSucces] = useState('');

  const moisActuel = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
    .format(new Date())
    .toUpperCase();

  useEffect(() => {
    let composantActif = true;

    async function verifierConnexion() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!composantActif) {
        return;
      }

      if (error || !session) {
        router.replace('/connexion');
        return;
      }

      setSessionVerifiee(true);
    }

    verifierConnexion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setSessionVerifiee(false);
        router.replace('/connexion');
        return;
      }

      setSessionVerifiee(true);
    });

    return () => {
      composantActif = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!sessionVerifiee || donneesChargees) {
      return;
    }

    async function chargerToutesLesDonnees() {
      setChargement(true);
      setMessageErreur('');

      try {
        const [compte, listePrelevements, listeDepenses] =
          await Promise.all([
            chargerOuCreerCompte(),
            chargerPrelevements(),
            chargerDepenses(),
          ]);

        setCompteId(compte.id);
        setSolde(String(compte.solde));
        setPrelevements(listePrelevements);
        setDepenses(listeDepenses);
        setDonneesChargees(true);
      } catch (error) {
        setMessageErreur(
          error instanceof Error
            ? error.message
            : 'Impossible de charger les données.'
        );
      } finally {
        setChargement(false);
      }
    }

    chargerToutesLesDonnees();
  }, [sessionVerifiee, donneesChargees]);

  const convertirMontant = (valeur: string) => {
    const valeurNettoyee = valeur
      .trim()
      .replace(/\s/g, '')
      .replace(',', '.');

    return Number(valeurNettoyee);
  };

  const soldeNumerique = convertirMontant(solde);

  const totalRestantPrelevements = prelevements
    .filter((prelevement) => !prelevement.paye)
    .reduce(
      (total, prelevement) =>
        total + Number(prelevement.montant),
      0
    );

  const totalDepenses = depenses.reduce(
    (total, depense) => total + Number(depense.montant),
    0
  );

  const resteAVivre =
    (Number.isFinite(soldeNumerique) ? soldeNumerique : 0) -
    totalRestantPrelevements -
    totalDepenses;

    const formatMontant = (montant: number) => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(montant);
    };
  
    const afficherErreur = (error: unknown) => {
      setMessageSucces('');
  
      setMessageErreur(
        error instanceof Error
          ? error.message
          : "Une erreur inattendue s'est produite."
      );
    };
  
    const afficherSucces = (message: string) => {
      setMessageErreur('');
      setMessageSucces(message);
  
      window.setTimeout(() => {
        setMessageSucces('');
      }, 3000);
    };
  
    const enregistrerSolde = async () => {
      if (!compteId) {
        return;
      }
  
      const nouveauSolde = convertirMontant(solde);
  
      if (!Number.isFinite(nouveauSolde)) {
        setMessageErreur('Le solde indiqué est incorrect.');
        return;
      }
  
      setActionEnCours(true);
      setMessageErreur('');
  
      try {
        await modifierSoldeCompte(compteId, nouveauSolde);
        setSolde(String(nouveauSolde));
        afficherSucces('Le solde a été enregistré.');
      } catch (error) {
        afficherErreur(error);
      } finally {
        setActionEnCours(false);
      }
    };
  
    const modifierPrelevement = async (
      prelevement: PrelevementSupabase
    ) => {
      const nouveauStatut = !prelevement.paye;
  
      setPrelevements((listeActuelle) =>
        listeActuelle.map((element) =>
          element.id === prelevement.id
            ? {
                ...element,
                paye: nouveauStatut,
              }
            : element
        )
      );
  
      try {
        await modifierStatutPrelevement(
          prelevement.id,
          nouveauStatut
        );
      } catch (error) {
        setPrelevements((listeActuelle) =>
          listeActuelle.map((element) =>
            element.id === prelevement.id
              ? {
                  ...element,
                  paye: prelevement.paye,
                }
              : element
          )
        );
  
        afficherErreur(error);
      }
    };
  
    const ajouterNouveauPrelevement = async (
      evenement: FormEvent<HTMLFormElement>
    ) => {
      evenement.preventDefault();
  
      const montant = convertirMontant(montantPrelevement);
  
      const jour =
        jourPrelevement.trim() === ''
          ? null
          : Number(jourPrelevement);
  
      if (!nomPrelevement.trim()) {
        setMessageErreur('Indique le nom du prélèvement.');
        return;
      }
  
      if (!Number.isFinite(montant) || montant <= 0) {
        setMessageErreur(
          'Indique un montant supérieur à zéro.'
        );
        return;
      }
  
      if (
        jour !== null &&
        (!Number.isInteger(jour) || jour < 1 || jour > 31)
      ) {
        setMessageErreur(
          'Le jour doit être compris entre 1 et 31.'
        );
        return;
      }
  
      setActionEnCours(true);
      setMessageErreur('');
  
      try {
        const nouveauPrelevement = await ajouterPrelevement(
          nomPrelevement,
          montant,
          jour
        );
  
        setPrelevements((listeActuelle) =>
          [...listeActuelle, nouveauPrelevement].sort(
            (premier, deuxieme) =>
              (premier.jour_prelevement ?? 32) -
              (deuxieme.jour_prelevement ?? 32)
          )
        );
  
        setNomPrelevement('');
        setMontantPrelevement('');
        setJourPrelevement('');
        setAfficherFormulairePrelevement(false);
  
        afficherSucces('Le prélèvement a été ajouté.');
      } catch (error) {
        afficherErreur(error);
      } finally {
        setActionEnCours(false);
      }
    };
  
    const supprimerUnPrelevement = async (
      prelevementId: string
    ) => {
      const ancienneListe = prelevements;
  
      setPrelevements((listeActuelle) =>
        listeActuelle.filter(
          (prelevement) => prelevement.id !== prelevementId
        )
      );
  
      try {
        await supprimerPrelevement(prelevementId);
        afficherSucces('Le prélèvement a été supprimé.');
      } catch (error) {
        setPrelevements(ancienneListe);
        afficherErreur(error);
      }
    };
  
    const ajouterNouvelleDepense = async (
      evenement: FormEvent<HTMLFormElement>
    ) => {
      evenement.preventDefault();
  
      const montant = convertirMontant(montantDepense);
  
      if (!nomDepense.trim()) {
        setMessageErreur('Indique le nom de la dépense.');
        return;
      }
  
      if (!Number.isFinite(montant) || montant <= 0) {
        setMessageErreur(
          'Indique un montant supérieur à zéro.'
        );
        return;
      }
  
      setActionEnCours(true);
      setMessageErreur('');
  
      try {
        const nouvelleDepense =
          await ajouterDepenseSupabase(
            nomDepense,
            montant
          );
  
        setDepenses((listeActuelle) => [
          nouvelleDepense,
          ...listeActuelle,
        ]);
  
        setNomDepense('');
        setMontantDepense('');
        setAfficherFormulaireDepense(false);
  
        afficherSucces('La dépense a été ajoutée.');
      } catch (error) {
        afficherErreur(error);
      } finally {
        setActionEnCours(false);
      }
    };
  
    const supprimerUneDepense = async (
      depenseId: string
    ) => {
      const ancienneListe = depenses;
  
      setDepenses((listeActuelle) =>
        listeActuelle.filter(
          (depense) => depense.id !== depenseId
        )
      );
  
      try {
        await supprimerDepenseSupabase(depenseId);
        afficherSucces('La dépense a été supprimée.');
      } catch (error) {
        setDepenses(ancienneListe);
        afficherErreur(error);
      }
    };
  
    const seDeconnecter = async () => {
      const { error } = await supabase.auth.signOut();
  
      if (error) {
        afficherErreur(error);
        return;
      }
  
      setSessionVerifiee(false);
      router.replace('/connexion');
      router.refresh();
    };
  
    if (!sessionVerifiee || chargement) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 text-3xl">
              💰
            </div>
  
            <p className="mt-5 text-sm font-semibold text-white">
              Chargement de Mon Budget…
            </p>
          </div>
        </main>
      );
    }
  
    return (
      <main className="min-h-screen bg-slate-100 pb-16 text-slate-900">
        <div className="mx-auto max-w-md">
          <header className="bg-slate-950 px-5 pb-8 pt-8 text-white">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                Bonjour Nicolas
              </p>
  
              <button
                type="button"
                onClick={seDeconnecter}
                className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-white"
              >
                Déconnexion
              </button>
            </div>
  
            <div className="mt-4 flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold">
                Mon Budget
              </h1>
  
              <div className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-slate-950">
                {moisActuel}
              </div>
            </div>
  
            <div className="mt-7">
              <label
                htmlFor="solde"
                className="text-sm font-medium text-slate-400"
              >
                Solde actuel du compte
              </label>
  
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="solde"
                  type="text"
                  inputMode="decimal"
                  value={solde}
                  onChange={(evenement) =>
                    setSolde(evenement.target.value)
                  }
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-4xl font-bold text-white outline-none"
                />
  
                <span className="text-3xl font-bold">€</span>
              </div>
  
              <button
                type="button"
                onClick={enregistrerSolde}
                disabled={actionEnCours}
                className="mt-4 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                Enregistrer le solde
              </button>
            </div>
          </header>
  
          <section className="-mt-4 px-4">
            <div className="rounded-3xl bg-yellow-400 p-5 shadow-lg">
              <p className="text-sm font-semibold text-slate-700">
                Reste à vivre
              </p>
  
              <p
                className={`mt-1 break-words text-4xl font-black ${
                  resteAVivre < 0
                    ? 'text-red-700'
                    : 'text-slate-950'
                }`}
              >
                {formatMontant(resteAVivre)}
              </p>
  
              <p className="mt-2 text-sm text-slate-700">
                Après les prélèvements restants et les
                dépenses du mois
              </p>
            </div>
          </section>
  
          {messageErreur && (
            <div
              role="alert"
              className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
            >
              {messageErreur}
            </div>
          )}
  
          {messageSucces && (
            <div
              role="status"
              className="mx-4 mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700"
            >
              {messageSucces}
            </div>
          )}
  
          <section className="grid grid-cols-2 gap-3 px-4 py-5">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">
                À payer
              </p>
  
              <p className="mt-2 text-xl font-bold">
                {formatMontant(totalRestantPrelevements)}
              </p>
            </div>
  
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Dépenses
              </p>
  
              <p className="mt-2 text-xl font-bold">
                {formatMontant(totalDepenses)}
              </p>
            </div>
          </section>
  
          <section className="px-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">
                  Prélèvements
                </h2>
  
                <p className="text-sm text-slate-500">
                  Coche ceux qui sont déjà passés
                </p>
              </div>
  
              <button
                type="button"
                onClick={() => {
                  setAfficherFormulairePrelevement(
                    !afficherFormulairePrelevement
                  );
                  setMessageErreur('');
                }}
                className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white"
              >
                + Ajouter
              </button>
            </div>
  
            {afficherFormulairePrelevement && (
              <form
                onSubmit={ajouterNouveauPrelevement}
                className="mb-3 rounded-2xl bg-white p-4 shadow-sm"
              >
                <label
                  htmlFor="nom-prelevement"
                  className="block text-sm font-semibold"
                >
                  Nom du prélèvement
                </label>
  
                <input
                  id="nom-prelevement"
                  type="text"
                  value={nomPrelevement}
                  onChange={(evenement) =>
                    setNomPrelevement(
                      evenement.target.value
                    )
                  }
                  placeholder="Exemple : Loyer"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-yellow-500"
                />
  
                <label
                  htmlFor="montant-prelevement"
                  className="mt-4 block text-sm font-semibold"
                >
                  Montant
                </label>
  
                <input
                  id="montant-prelevement"
                  type="text"
                  inputMode="decimal"
                  value={montantPrelevement}
                  onChange={(evenement) =>
                    setMontantPrelevement(
                      evenement.target.value
                    )
                  }
                  placeholder="0,00"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-yellow-500"
                />
  
                <label
                  htmlFor="jour-prelevement"
                  className="mt-4 block text-sm font-semibold"
                >
                  Jour du prélèvement
                </label>
  
                <input
                  id="jour-prelevement"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="31"
                  value={jourPrelevement}
                  onChange={(evenement) =>
                    setJourPrelevement(
                      evenement.target.value
                    )
                  }
                  placeholder="Exemple : 5"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-yellow-500"
                />
  
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAfficherFormulairePrelevement(false)
                    }
                    className="rounded-xl bg-slate-200 p-3 font-semibold"
                  >
                    Annuler
                  </button>
  
                  <button
                    type="submit"
                    disabled={actionEnCours}
                    className="rounded-xl bg-yellow-400 p-3 font-bold text-slate-950 disabled:opacity-50"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            )}
  
            {prelevements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
                <p className="text-sm text-slate-500">
                  Aucun prélèvement enregistré pour ce mois.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {prelevements.map((prelevement) => (
                  <div
                    key={prelevement.id}
                    className={`rounded-2xl border p-4 shadow-sm ${
                      prelevement.paye
                        ? 'border-green-200 bg-green-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={prelevement.paye}
                        onChange={() =>
                          modifierPrelevement(prelevement)
                        }
                        className="h-6 w-6 shrink-0 accent-green-600"
                      />
  
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-semibold ${
                            prelevement.paye
                              ? 'text-slate-500 line-through'
                              : 'text-slate-900'
                          }`}
                        >
                          {prelevement.nom}
                        </p>
  
                        <p className="text-xs text-slate-500">
                          {prelevement.paye
                            ? 'Prélevé'
                            : prelevement.jour_prelevement
                            ? `Prévu le ${prelevement.jour_prelevement}`
                            : 'En attente'}
                        </p>
                      </div>
  
                      <p className="shrink-0 font-bold">
                        {formatMontant(
                          Number(prelevement.montant)
                        )}
                      </p>
                    </div>
  
                    <button
                      type="button"
                      onClick={() =>
                        supprimerUnPrelevement(
                          prelevement.id
                        )
                      }
                      className="mt-3 w-full rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
  
          <section className="mt-7 px-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">
                  Dépenses ajoutées
                </h2>
  
                <p className="text-sm text-slate-500">
                  Courses, carburant, sorties…
                </p>
              </div>
  
              <button
                type="button"
                onClick={() => {
                  setAfficherFormulaireDepense(
                    !afficherFormulaireDepense
                  );
                  setMessageErreur('');
                }}
                className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white"
              >
                + Ajouter
              </button>
            </div>
  
            {afficherFormulaireDepense && (
              <form
                onSubmit={ajouterNouvelleDepense}
                className="mb-3 rounded-2xl bg-white p-4 shadow-sm"
              >
                <label
                  htmlFor="nom-depense"
                  className="block text-sm font-semibold"
                >
                  Nom de la dépense
                </label>
  
                <input
                  id="nom-depense"
                  type="text"
                  value={nomDepense}
                  onChange={(evenement) =>
                    setNomDepense(evenement.target.value)
                  }
                  placeholder="Exemple : Courses"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-yellow-500"
                />
  
                <label
                  htmlFor="montant-depense"
                  className="mt-4 block text-sm font-semibold"
                >
                  Montant
                </label>
  
                <input
                  id="montant-depense"
                  type="text"
                  inputMode="decimal"
                  value={montantDepense}
                  onChange={(evenement) =>
                    setMontantDepense(
                      evenement.target.value
                    )
                  }
                  placeholder="0,00"
                  className="mt-1 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-yellow-500"
                />
  
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAfficherFormulaireDepense(false)
                    }
                    className="rounded-xl bg-slate-200 p-3 font-semibold"
                  >
                    Annuler
                  </button>
  
                  <button
                    type="submit"
                    disabled={actionEnCours}
                    className="rounded-xl bg-yellow-400 p-3 font-bold text-slate-950 disabled:opacity-50"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            )}
  
            {depenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
                <p className="text-sm text-slate-500">
                  Aucune dépense ajoutée pour ce mois.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {depenses.map((depense) => (
                  <div
                    key={depense.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {depense.nom}
                      </p>
  
                      <p className="text-sm text-slate-500">
                        {formatMontant(
                          Number(depense.montant)
                        )}
                      </p>
                    </div>
  
                    <button
                      type="button"
                      onClick={() =>
                        supprimerUneDepense(depense.id)
                      }
                      className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }