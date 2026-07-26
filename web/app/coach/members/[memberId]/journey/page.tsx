import { redirect } from "next/navigation";

type Props = { params: Promise<{ memberId: string }> };

/** Legacy URL — journey now lives on the member page as a tab. */
export default async function CoachMemberJourneyRedirectPage({ params }: Props) {
  const { memberId } = await params;
  redirect(`/coach/members/${memberId}?tab=journey`);
}
