// src/hooks/useMe.ts
import { useQuery } from "@tanstack/react-query";
import { fetchMe, MeResponse } from "@/services/auth";

export function useMe() {
    return useQuery<MeResponse>({
        queryKey: ["me"],
        queryFn: fetchMe,
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });
}
