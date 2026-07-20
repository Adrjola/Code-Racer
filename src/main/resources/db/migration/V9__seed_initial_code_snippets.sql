insert into category (id, name, description, active, created_at, updated_at)
values (
    '8b65a578-5fe3-4f06-9a9e-29989d6d537f',
    'Algorithms',
    'Algorithm and data structure practice snippets',
    true,
    now(),
    now()
)
on conflict (name) do nothing;

insert into code_snippet (
    id,
    snippet_id,
    revision_number,
    title,
    source,
    content_hash,
    difficulty,
    lifecycle,
    category_id,
    created_at,
    updated_at,
    version
)
values
    (
        '2d357563-9706-43b0-b11e-e4ab2f77b1d1',
        '7f685982-9328-4746-ae41-fbd5af99864e',
        1,
        'Two Sum (Brute Force)',
        $snippet$class Solution {
  int[] twoSum(int[] nums, int target) {
    for (int i = 0; i < nums.length; i++) {
      for (int j = i + 1; j < nums.length; j++) {
        if (nums[i] + nums[j] == target) {
          return new int[] {i, j};
        }
      }
    }
    return new int[0];
  }
}$snippet$,
        '46c549c012343c4835b6d09e7aa6b8206fe2721009290cc5e55e40c3606c2675',
        'EASY',
        'ACTIVE',
        (select id from category where name = 'Algorithms'),
        now(),
        now(),
        0
    ),
    (
        '094f4d07-dcf8-4fc3-b2c7-687b7d6f4707',
        '071f4ee8-d96f-4c8a-a085-4eb36e95f6f4',
        1,
        'Reverse String',
        $snippet$class Solution {
  String reverse(String input) {
    return new StringBuilder(input).reverse().toString();
  }
}$snippet$,
        '2b3bbcc520be74136588699714b47be696df3c76cd0afdb43ca83b7fdb2295b4',
        'EASY',
        'ACTIVE',
        (select id from category where name = 'Algorithms'),
        now(),
        now(),
        0
    ),
    (
        'fbab83aa-e7b5-4c42-91b3-3394f2f291ef',
        'e1001f6b-a245-477e-9286-f5063ce9316f',
        1,
        'Valid Parentheses',
        $snippet$class Solution {
  boolean hasBalancedBrackets(String text) {
    int balance = 0;

    for (char current : text.toCharArray()) {
      if (current == '(') {
        balance++;
      } else if (current == ')') {
        balance--;
        if (balance < 0) {
          return false;
        }
      }
    }

    return balance == 0;
  }
}$snippet$,
        '83af265acec8d5bec847f7b2e6615dbcf7cd1126aef66d98caafcec307ca1c82',
        'MEDIUM',
        'ACTIVE',
        (select id from category where name = 'Algorithms'),
        now(),
        now(),
        0
    )
on conflict (snippet_id, revision_number) do nothing;
