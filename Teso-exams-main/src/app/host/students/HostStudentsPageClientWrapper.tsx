"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import HostStudentsClient from "@/components/host/students/HostStudentsClient";

export default function HostStudentsPageClientWrapper({
  initialCandidates,
  hostId
}: {
  initialCandidates: any[];
  hostId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => {
      setLoading(false);
    }, 600);
  };

  return (
    <HostStudentsClient
      candidates={initialCandidates}
      loading={loading}
      onRefresh={handleRefresh}
    />
  );
}
