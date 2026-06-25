from typing import List, Dict


class MatchService:
    @staticmethod
    def build_match_scores(job: dict, workers: List[dict]) -> List[Dict]:
        matches = []
        for worker in workers:
            score = 0
            if worker.get('skills') and job.get('required_skill') in worker['skills']:
                score += 70
            elif worker.get('skills'):
                score += 35

            location = (job.get('location') or '').lower()
            if any(word in location for word in ['village', 'region', 'field', 'pimplad', 'sinnar']):
                score += 30

            if worker.get('daily_rate', 0) and job.get('payment', 0):
                if worker['daily_rate'] <= job['payment']:
                    score += 15

            matches.append({**worker, 'match_score': score})

        return sorted(matches, key=lambda item: item['match_score'], reverse=True)
