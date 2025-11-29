namespace Databank.Common;

public sealed record PaginationParams
{
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 10;

    public int Skip => (PageNumber - 1) * PageSize;
    public int Take => PageSize;
}

