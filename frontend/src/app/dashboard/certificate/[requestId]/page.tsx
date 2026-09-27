"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { CertificateView, BirthRecordData } from "@/types";

function formatDate(value: string | null): string {
  if (!value) return "……………………………………";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

// A line of dots to fill unset fields, matching the paper form's blank-line
// convention ("……………") rather than showing an empty gap.
function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-2 border-b border-dotted border-gray-400 py-1 text-sm">
      <span className="shrink-0 font-medium text-ink">{label}:</span>
      <span className="text-ink">{value || "……………………………………"}</span>
    </div>
  );
}

function BirthCertificateDocument({ view }: { view: CertificateView }) {
  const data = view.record.recordData as BirthRecordData;
  const [surname, ...rest] = view.record.fullName.split(" ");
  const givenNames = rest.join(" ");

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-ink print:p-0" id="certificate-print-area">
      <div className="grid grid-cols-2 gap-4 text-center text-xs">
        <div>
          <p className="font-semibold">REPUBLIQUE DU CAMEROUN</p>
          <p>Paix - Travail - Patrie</p>
        </div>
        <div>
          <p className="font-semibold">REPUBLIC OF CAMEROON</p>
          <p>Peace - Work - Fatherland</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <Field label="Region" value={data.region ?? view.record.registeredCouncilRegion} />
        <Field label="Region" value={data.region ?? view.record.registeredCouncilRegion} />
        <Field label="Department" value={data.department} />
        <Field label="Division" value={data.department} />
        <Field label="Arrondissement" value={data.arrondissement} />
        <Field label="Subdivision" value={data.arrondissement} />
      </div>

      <p className="mt-4 text-sm">
        <span className="font-medium">Centre d&apos;état civil / Civil Status Registration:</span> {data.centreEtatCivil || view.originCouncilName}
      </p>

      <h1 className="mt-6 text-center text-xl font-bold uppercase tracking-wide">
        Acte de Naissance / Birth Certificate
      </h1>
      <p className="mt-1 text-center text-sm">N°: {view.record.registrationNumber || "………………"}</p>

      <div className="mt-6 flex flex-col gap-1">
        <Field label="Nom de l'enfant / Surname of the child" value={surname} />
        <Field label="Prénoms de l'enfant / Given names of the child" value={givenNames} />
        <Field label="Né(e) le / Born on" value={formatDate(view.record.dateOfBirth)} />
        <Field label="À / At" value={view.record.placeOfBirth} />
        <Field label="De sexe / Sex" value={data.sex === "F" ? "Féminin / Female" : data.sex === "M" ? "Masculin / Male" : undefined} />
      </div>

      <h2 className="mt-6 border-t border-ink pt-3 text-sm font-semibold uppercase">Père / Father</h2>
      <div className="mt-2 flex flex-col gap-1">
        <Field label="Nom / Name" value={data.father?.name} />
        <Field label="Né à / Born at" value={data.father?.birthplace} />
        <Field label="Le / On" value={formatDate(data.father?.birthdate ?? null)} />
        <Field label="Domicilié à / Resident at" value={data.father?.residence} />
        <Field label="Profession" value={data.father?.profession} />
        <Field label="Nationalité / Nationality" value={data.father?.nationality} />
        <Field label="Document de référence / ID reference" value={data.father?.idReference} />
      </div>

      <h2 className="mt-6 border-t border-ink pt-3 text-sm font-semibold uppercase">Mère / Mother</h2>
      <div className="mt-2 flex flex-col gap-1">
        <Field label="Nom / Name" value={data.mother?.name} />
        <Field label="Née à / Born at" value={data.mother?.birthplace} />
        <Field label="Le / On" value={formatDate(data.mother?.birthdate ?? null)} />
        <Field label="Domiciliée à / Resident at" value={data.mother?.residence} />
        <Field label="Profession" value={data.mother?.profession} />
        <Field label="Nationalité / Nationality" value={data.mother?.nationality} />
        <Field label="Document de référence / ID reference" value={data.mother?.idReference} />
      </div>

      <div className="mt-6 flex flex-col gap-1 border-t border-ink pt-3">
        <Field label="Dressé le / Drawn up on" value={formatDate(data.dateDrawnUp ?? null)} />
        <Field label="Sur la déclaration de / Declared by" value={data.declarant} />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted">Le Secrétaire d&apos;état civil / Secretary</p>
          <p className="mt-6 border-t border-ink pt-1 font-medium">{data.secretaryName || "……………………………"}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Signature de l&apos;Officier d&apos;état civil / Civil Status Registrar</p>
          <p className="mt-6 border-t border-ink pt-1 font-medium">{data.registrarName || "……………………………"}</p>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        Issued via CSCMS - originally registered at {view.originCouncilName}
        {view.destinationCouncilName ? `, collected at ${view.destinationCouncilName}` : ""}.
      </p>
    </div>
  );
}

export default function CertificatePage() {
  const { authFetch } = useAuth();
  const params = useParams<{ requestId: string }>();
  const [view, setView] = useState<CertificateView | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await authFetch<CertificateView>(`/requests/${params.requestId}/certificate`);
        setView(data);
        setStatus("done");
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Something went wrong.");
      }
    })();
  }, [authFetch, params.requestId]);

  if (status === "loading") return <p className="text-muted">Loading…</p>;
  if (status === "error") {
    return (
      <Card withFlagBar={false} className="max-w-xl">
        <p className="text-danger">{message}</p>
      </Card>
    );
  }
  if (!view || view.record.recordType !== "birth") {
    // Death/marriage records don't have a matching visual template yet -
    // fall back to a plain summary rather than a broken layout.
    return (
      <Card withFlagBar={false} className="max-w-xl">
        <p className="text-ink">
          {view ? `${view.record.recordType} certificate for ${view.record.fullName}, registered at ${view.originCouncilName}.` : "Certificate not found."}
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-semibold text-ink">Your certificate</h1>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>
      <Card withFlagBar={false}>
        <BirthCertificateDocument view={view} />
      </Card>
    </div>
  );
}
